"""
AI Service — Full RAG pipeline integrating live database data, ChromaDB vector retrieval,
and Google Gemini Generative AI.
"""
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import time
import logging
import os

from app.core.config import settings, get_gemini_api_key
from app.core.vector_db import vector_db
from app.models.all_models import AILog, FoodWaste, Order, OrderItem, Menu, Review, Customer
from app.repositories.ai_repository import AIRepository
from app.schemas.ai import ChatRequest, ChatResponse, AILogResponse

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AIRepository(db)

    # ─── Live Data Fetchers ───────────────────────────────────────────────────

    async def _get_menu_context(self) -> str:
        """Fetch full menu items from database for grounding Gemini responses."""
        try:
            menu_q = select(Menu).where(Menu.is_available == True)
            res = await self.db.execute(menu_q)
            items = res.scalars().all()

            if not items:
                return "Menu database is empty."

            lines = ["Complete Available Restaurant Menu:"]
            for m in items:
                veg_tag = "[VEGETARIAN]" if m.is_vegetarian else "[NON-VEG]"
                desc = f" — {m.description}" if m.description else ""
                cat = m.category.value if hasattr(m.category, 'value') else str(m.category)
                lines.append(f"  • {m.name} ({veg_tag}, Category: {cat}, Price: ₹{m.price:.2f}){desc}")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Menu context error: {e}")
            return "Menu data temporarily unavailable."

    async def _get_waste_context(self) -> str:
        """Fetch recent food waste data from database."""
        try:
            now = datetime.now(timezone.utc)
            week_ago = now - timedelta(days=7)

            waste_q = select(FoodWaste).order_by(desc(FoodWaste.created_at)).limit(10)
            waste_res = await self.db.execute(waste_q)
            waste_items = waste_res.scalars().all()

            cost_q = select(func.sum(FoodWaste.cost)).where(FoodWaste.created_at >= week_ago)
            cost_res = await self.db.execute(cost_q)
            total_cost = cost_res.scalar() or 0

            qty_q = select(func.sum(FoodWaste.quantity_wasted)).where(FoodWaste.created_at >= week_ago)
            qty_res = await self.db.execute(qty_q)
            total_qty = qty_res.scalar() or 0

            lines = [
                f"Food Waste Summary (last 7 days):",
                f"  Total quantity wasted: {total_qty:.1f} kg",
                f"  Total cost impact: ₹{total_cost:.2f}",
            ]

            if waste_items:
                lines.append("Recent waste logs (latest 10):")
                reason_counts: Dict[str, int] = {}
                for w in waste_items:
                    reason_counts[w.reason] = reason_counts.get(w.reason, 0) + 1
                    lines.append(
                        f"  • {w.ingredient_name}: {w.quantity_wasted:.1f} {w.unit} "
                        f"— Reason: {w.reason} — Cost: ₹{w.cost:.2f}"
                    )
                if reason_counts:
                    top_reason = max(reason_counts, key=reason_counts.get)
                    lines.append(f"Most common waste reason: '{top_reason}' ({reason_counts[top_reason]} occurrences)")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Waste context error: {e}")
            return "Food waste data temporarily unavailable."

    async def _get_sales_context(self) -> str:
        """Fetch recent sales and order data from database."""
        try:
            now = datetime.now(timezone.utc)
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_ago = now - timedelta(days=7)

            rev_q = select(func.sum(Order.total_amount)).where(Order.created_at >= today)
            rev_res = await self.db.execute(rev_q)
            today_rev = rev_res.scalar() or 0

            ord_q = select(func.count(Order.id)).where(Order.created_at >= today)
            ord_res = await self.db.execute(ord_q)
            today_orders = ord_res.scalar() or 0

            week_rev_q = select(func.sum(Order.total_amount)).where(Order.created_at >= week_ago)
            week_rev_res = await self.db.execute(week_rev_q)
            week_rev = week_rev_res.scalar() or 0

            top_q = (
                select(Menu.name, func.count(OrderItem.id).label("order_count"))
                .join(OrderItem, OrderItem.menu_item_id == Menu.id)
                .group_by(Menu.name)
                .order_by(desc("order_count"))
                .limit(5)
            )
            top_res = await self.db.execute(top_q)
            top_items = top_res.all()

            lines = [
                "Sales & Revenue Summary:",
                f"  Today's Revenue: ₹{today_rev:,.2f} ({today_orders} orders)",
                f"  Last 7 Days Revenue: ₹{week_rev:,.2f}",
            ]

            if top_items:
                lines.append("Top 5 Best-Selling Menu Items (this week):")
                for i, (name, count) in enumerate(top_items, 1):
                    lines.append(f"  {i}. {name} — {count} orders")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Sales context error: {e}")
            return "Sales data temporarily unavailable."

    async def _get_reviews_context(self) -> str:
        """Fetch recent customer review sentiment data from database."""
        try:
            pos_q = select(func.count(Review.id)).where(Review.sentiment == "positive")
            neg_q = select(func.count(Review.id)).where(Review.sentiment == "negative")
            neu_q = select(func.count(Review.id)).where(Review.sentiment == "neutral")

            pos = (await self.db.execute(pos_q)).scalar() or 0
            neg = (await self.db.execute(neg_q)).scalar() or 0
            neu = (await self.db.execute(neu_q)).scalar() or 0
            total = pos + neg + neu

            avg_q = select(func.avg(Review.rating))
            avg_res = await self.db.execute(avg_q)
            avg_rating = avg_res.scalar() or 0

            recent_q = select(Review).order_by(desc(Review.created_at)).limit(5)
            recent_res = await self.db.execute(recent_q)
            recent = recent_res.scalars().all()

            lines = [
                "Customer Review & Sentiment Analysis:",
                f"  Total reviews: {total}",
                f"  Average rating: {avg_rating:.1f}/5.0",
                f"  Positive: {pos} ({(pos/total*100) if total else 0:.1f}%)",
                f"  Neutral: {neu} ({(neu/total*100) if total else 0:.1f}%)",
                f"  Negative: {neg} ({(neg/total*100) if total else 0:.1f}%)",
            ]

            if recent:
                lines.append("Recent customer feedback:")
                for r in recent:
                    lines.append(
                        f"  • [{r.sentiment.upper()}] Rating {r.rating}/5 — \"{r.comment[:120]}...\""
                        if r.comment and len(r.comment) > 120
                        else f"  • [{r.sentiment.upper()}] Rating {r.rating}/5 — \"{r.comment}\""
                    )

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Reviews context error: {e}")
            return "Review data temporarily unavailable."

    # ─── Main RAG Answer Method ───────────────────────────────────────────────

    async def answer_question(self, user_id: Optional[int], request: ChatRequest) -> ChatResponse:
        start_time = time.time()
        question = request.question.strip()
        logger.info(f"Received AI chat question: '{question}' for user_id: {user_id}")

        # 1. Check Gemini configuration securely
        api_key = get_gemini_api_key()
        if not api_key:
            logger.warning("Gemini API key is missing or set to default placeholder.")
            raise HTTPException(
                status_code=400,
                detail="Gemini API Key is not configured. Please set a valid GOOGLE_API_KEY in backend/.env to use the AI Assistant."
            )

        # 2. ChromaDB vector retrieval for RAG
        context_texts = []
        retrieved_items = []
        chroma_context = ""
        try:
            retrieved_items = vector_db.query(question, n_results=5)
            context_texts = [item["text"] for item in retrieved_items]
            chroma_context = "\n".join([f"- {text}" for text in context_texts])
        except Exception as e:
            logger.error(f"ChromaDB retrieval failed: {e}")
            chroma_context = "ChromaDB vector retrieval is currently offline or unavailable."

        # 3. Live database context retrieval
        menu_ctx = await self._get_menu_context()
        waste_ctx = await self._get_waste_context()
        sales_ctx = await self._get_sales_context()
        reviews_ctx = await self._get_reviews_context()

        # 4. Call Google Gemini AI
        answer = ""
        model_used = settings.GEMINI_MODEL

        try:
            from google import genai
            client = genai.Client(api_key=api_key)

            prompt = (
                "You are the AI Assistant for RestaurantAI, an intelligent restaurant management and dining concierge platform.\n"
                "Answer the user's specific question clearly, accurately, and helpfully using the live restaurant data and knowledge base provided below.\n\n"
                "RULES:\n"
                "1. Answer ONLY based on the provided live data and knowledge base context.\n"
                "2. Directly address the user's exact question. For menu, dish, pricing, vegetarian/spicy items, sales trends, or food waste queries, refer to the actual data provided below.\n"
                "3. If pricing is requested, format prices in Indian Rupees (₹).\n"
                "4. Be polite, concise, and informative.\n\n"
                f"=== LIVE RESTAURANT MENU ===\n{menu_ctx}\n\n"
                f"=== SALES & BEST-SELLERS ===\n{sales_ctx}\n\n"
                f"=== FOOD WASTE LOGS ===\n{waste_ctx}\n\n"
                f"=== CUSTOMER REVIEWS & SENTIMENT ===\n{reviews_ctx}\n\n"
                f"=== KNOWLEDGE BASE (RAG DOCS) ===\n{chroma_context}\n\n"
                f"=== USER QUESTION ===\n{question}"
            )

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt
            )

            if response and response.text:
                answer = response.text
                logger.info(f"Successfully generated Gemini answer for question: '{question}'")
            else:
                raise Exception("Gemini returned an empty response.")

        except HTTPException:
            raise
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Gemini API Error for question '{question}': {err_msg}")
            
            # Safe error categorization without exposing API key
            if "API_KEY_INVALID" in err_msg or "400" in err_msg or "403" in err_msg or "API key not valid" in err_msg:
                error_detail = "Invalid Gemini API Key provided. Please verify GOOGLE_API_KEY in backend/.env."
            elif "404" in err_msg or "not found" in err_msg.lower():
                error_detail = f"Configured Gemini model '{settings.GEMINI_MODEL}' was not found or is unsupported."
            elif "429" in err_msg or "quota" in err_msg.lower():
                error_detail = "Gemini API quota or rate limit exceeded. Please try again later."
            else:
                error_detail = f"Gemini AI Error: {err_msg}"

            raise HTTPException(
                status_code=500,
                detail=error_detail
            )

        elapsed_ms = int((time.time() - start_time) * 1000)

        # 5. Log interaction to database
        try:
            ai_log = AILog(
                user_id=user_id,
                question=question,
                answer=answer,
                context_retrieved=context_texts,
                model_used=model_used,
                tokens_used=len(question.split()) + len(answer.split()),
                response_time_ms=elapsed_ms
            )
            await self.repo.log_interaction(ai_log)
        except Exception as e:
            logger.error(f"Failed to log AI interaction: {e}")

        return ChatResponse(
            answer=answer,
            context_used=context_texts,
            sources=retrieved_items,
            model_used=model_used,
            response_time_ms=elapsed_ms,
            created_at=datetime.utcnow()
        )

    async def get_chat_history(self, user_id: Optional[int], page: int = 1, per_page: int = 20):
        logs, total = await self.repo.get_logs(page=page, per_page=per_page, user_id=user_id)
        return [AILogResponse.model_validate(log) for log in logs], total

