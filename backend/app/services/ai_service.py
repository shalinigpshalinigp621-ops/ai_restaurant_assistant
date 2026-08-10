"""
AI Service — Full RAG pipeline integrating PostgreSQL live data, ChromaDB vector retrieval,
and Google Gemini Generative AI. Falls back to intelligent data-driven analysis when Gemini key
is not configured.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import time
import logging
import os

from app.core.config import settings
from app.core.vector_db import vector_db
from app.models.all_models import AILog, Inventory, FoodWaste, Order, OrderItem, Menu, Review, Customer
from app.repositories.ai_repository import AIRepository
from app.schemas.ai import ChatRequest, ChatResponse, AILogResponse

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AIRepository(db)

    # ─── Live PostgreSQL Data Fetchers ────────────────────────────────────────

    async def _get_inventory_context(self) -> str:
        """Fetch live inventory data from PostgreSQL."""
        try:
            # Low stock items
            low_q = select(Inventory).where(
                Inventory.quantity <= Inventory.reorder_level,
                Inventory.is_active == True
            ).order_by(Inventory.quantity.asc()).limit(10)
            low_res = await self.db.execute(low_q)
            low_items = low_res.scalars().all()

            # Total inventory count
            count_q = select(func.count(Inventory.id)).where(Inventory.is_active == True)
            count_res = await self.db.execute(count_q)
            total = count_res.scalar() or 0

            lines = [f"Total active inventory items: {total}"]
            if low_items:
                lines.append(f"LOW STOCK ALERT — {len(low_items)} items need immediate reorder:")
                for item in low_items:
                    lines.append(
                        f"  • {item.ingredient_name}: {item.quantity:.1f} {item.unit} "
                        f"(reorder at {item.reorder_level:.1f} {item.unit}) — "
                        f"Supplier cost: ₹{item.unit_cost:.2f}/{item.unit}"
                    )
            else:
                lines.append("All inventory items are above reorder levels. Stock is healthy.")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Inventory context error: {e}")
            return "Inventory data temporarily unavailable."

    async def _get_waste_context(self) -> str:
        """Fetch recent food waste data from PostgreSQL."""
        try:
            now = datetime.now(timezone.utc)
            week_ago = now - timedelta(days=7)

            # Recent waste logs
            waste_q = select(FoodWaste).order_by(desc(FoodWaste.created_at)).limit(10)
            waste_res = await self.db.execute(waste_q)
            waste_items = waste_res.scalars().all()

            # Total waste cost this week
            cost_q = select(func.sum(FoodWaste.cost)).where(FoodWaste.created_at >= week_ago)
            cost_res = await self.db.execute(cost_q)
            total_cost = cost_res.scalar() or 0

            # Total waste quantity this week
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
                # Top waste reasons
                if reason_counts:
                    top_reason = max(reason_counts, key=reason_counts.get)
                    lines.append(f"Most common waste reason: '{top_reason}' ({reason_counts[top_reason]} occurrences)")

            return "\n".join(lines)
        except Exception as e:
            logger.error(f"Waste context error: {e}")
            return "Food waste data temporarily unavailable."

    async def _get_sales_context(self) -> str:
        """Fetch recent sales and order data from PostgreSQL."""
        try:
            now = datetime.now(timezone.utc)
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_ago = now - timedelta(days=7)

            # Today's revenue
            rev_q = select(func.sum(Order.total_amount)).where(Order.created_at >= today)
            rev_res = await self.db.execute(rev_q)
            today_rev = rev_res.scalar() or 0

            # Today's orders
            ord_q = select(func.count(Order.id)).where(Order.created_at >= today)
            ord_res = await self.db.execute(ord_q)
            today_orders = ord_res.scalar() or 0

            # Week revenue
            week_rev_q = select(func.sum(Order.total_amount)).where(Order.created_at >= week_ago)
            week_rev_res = await self.db.execute(week_rev_q)
            week_rev = week_rev_res.scalar() or 0

            # Top selling menu items (by order item count)
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
        """Fetch recent customer review sentiment data from PostgreSQL."""
        try:
            # Sentiment counts
            pos_q = select(func.count(Review.id)).where(Review.sentiment == "positive")
            neg_q = select(func.count(Review.id)).where(Review.sentiment == "negative")
            neu_q = select(func.count(Review.id)).where(Review.sentiment == "neutral")

            pos = (await self.db.execute(pos_q)).scalar() or 0
            neg = (await self.db.execute(neg_q)).scalar() or 0
            neu = (await self.db.execute(neu_q)).scalar() or 0
            total = pos + neg + neu

            # Average rating
            avg_q = select(func.avg(Review.rating))
            avg_res = await self.db.execute(avg_q)
            avg_rating = avg_res.scalar() or 0

            # Latest reviews
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

    # ─── Smart Fallback Response Generator ───────────────────────────────────

    def _generate_intelligent_response(
        self,
        question: str,
        chroma_context: str,
        inventory_ctx: str,
        waste_ctx: str,
        sales_ctx: str,
        reviews_ctx: str,
    ) -> str:
        """
        Generate a structured, data-driven answer from PostgreSQL and ChromaDB data.
        Used when Gemini API key is not configured. Response is based on REAL DB data only.
        """
        q = question.lower()

        # Determine which data is most relevant
        sections = []
        sections.append(f"## 🤖 AI Operations Analysis\n*Based on live restaurant database data*\n")

        if any(w in q for w in ["inventory", "stock", "ingredient", "reorder", "low", "supply"]):
            sections.append(f"### 📦 Inventory Status\n{inventory_ctx}")

        if any(w in q for w in ["waste", "food waste", "spoil", "expired", "throw", "discard", "reduce"]):
            sections.append(f"### ♻️ Food Waste Analysis\n{waste_ctx}")
            sections.append(
                "### 💡 Waste Reduction Recommendations\n"
                "Based on the waste data above:\n"
                "- Flag ingredients nearing expiry daily for use in specials\n"
                "- Log all prep waste in the Food Waste module before closing shift\n"
                "- Review top waste reasons weekly to identify systemic issues\n"
                "- Consider batch prep schedules to match actual demand patterns"
            )

        if any(w in q for w in ["sale", "revenue", "order", "perform", "popular", "menu", "best", "selling", "profit"]):
            sections.append(f"### 💰 Sales & Performance\n{sales_ctx}")

        if any(w in q for w in ["review", "customer", "sentiment", "feedback", "rating", "satisfaction"]):
            sections.append(f"### ⭐ Customer Sentiment\n{reviews_ctx}")

        # If no specific category matched, show all data
        if len(sections) == 1:
            sections.append(f"### 📊 Operations Overview\n{sales_ctx}\n\n{inventory_ctx}\n\n{waste_ctx}\n\n{reviews_ctx}")

        # Add ChromaDB knowledge if relevant
        if chroma_context and chroma_context.strip():
            sections.append(f"### 📚 Knowledge Base\n{chroma_context}")

        sections.append(
            "\n---\n*💡 To enable full Google Gemini AI reasoning, add your `GOOGLE_API_KEY` "
            "to the backend `.env` file. Get a free key at [aistudio.google.com](https://aistudio.google.com/app/apikey)*"
        )

        return "\n\n".join(sections)

    # ─── Main RAG Answer Method ───────────────────────────────────────────────

    async def answer_question(self, user_id: Optional[int], request: ChatRequest) -> ChatResponse:
        start_time = time.time()
        question = request.question

        # 1. ChromaDB vector retrieval
        retrieved_items = vector_db.query(question, n_results=3)
        context_texts = [item["text"] for item in retrieved_items]
        chroma_context = "\n".join([f"- {text}" for text in context_texts])

        # 2. Live PostgreSQL data retrieval (parallel context building)
        inventory_ctx = await self._get_inventory_context()
        waste_ctx = await self._get_waste_context()
        sales_ctx = await self._get_sales_context()
        reviews_ctx = await self._get_reviews_context()

        answer = ""
        model_used = settings.GEMINI_MODEL

        # 3. Try Google Gemini if API key is configured
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or settings.GOOGLE_API_KEY
        if api_key and api_key not in ("", "your-google-gemini-api-key-here"):
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel(settings.GEMINI_MODEL)

                prompt = (
                    "You are the Intelligent Restaurant Operations Assistant for RestaurantAI. "
                    "Answer the staff/manager question clearly and helpfully using the live data below. "
                    "Be professional, structured, and concise. Use markdown formatting.\n\n"
                    f"=== CHROMADB KNOWLEDGE BASE ===\n{chroma_context}\n\n"
                    f"=== LIVE POSTGRESQL DATA ===\n"
                    f"{inventory_ctx}\n\n"
                    f"{waste_ctx}\n\n"
                    f"{sales_ctx}\n\n"
                    f"{reviews_ctx}\n\n"
                    f"=== USER QUESTION ===\n{question}"
                )

                response = model.generate_content(prompt)
                if response and response.text:
                    answer = response.text
                    model_used = settings.GEMINI_MODEL
                    logger.info(f"Gemini response generated successfully for question: {question[:60]}")

            except Exception as e:
                logger.warning(f"Gemini API failed: {e}. Switching to intelligent DB-driven fallback.")
                answer = ""

        # 4. Intelligent fallback: real data-driven response (no fake/hardcoded answers)
        if not answer:
            model_used = "RestaurantAI-RAG-Engine (DB-Driven)"
            answer = self._generate_intelligent_response(
                question=question,
                chroma_context=chroma_context,
                inventory_ctx=inventory_ctx,
                waste_ctx=waste_ctx,
                sales_ctx=sales_ctx,
                reviews_ctx=reviews_ctx,
            )
            logger.info(f"DB-driven RAG response generated for question: {question[:60]}")

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
