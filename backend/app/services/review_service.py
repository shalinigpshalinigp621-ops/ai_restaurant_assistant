"""
Review Service — Business logic for customer reviews and sentiment analysis using Google Gemini.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Tuple, List, Optional
from app.models.all_models import Review
from app.repositories.review_repository import ReviewRepository
from app.schemas.review import ReviewCreate, ReviewResponse, SentimentStats
from app.core.config import settings
import logging
import random

logger = logging.getLogger(__name__)

class ReviewService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReviewRepository(db)

    async def _analyze_sentiment(self, rating: int, comment: Optional[str]) -> Tuple[str, float]:
        """
        Analyzes the sentiment of a review using Google Gemini if configured,
        otherwise falls back to a standard rating/word heuristic.
        """
        sentiment = "neutral"
        score = 0.5
        
        if not comment:
            if rating >= 4:
                return "positive", 0.8 + (rating * 0.04)
            elif rating == 3:
                return "neutral", 0.5
            else:
                return "negative", 0.1 + (rating * 0.1)

        # Check for Gemini API key configuration
        if settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "your-google-gemini-api-key-here":
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GOOGLE_API_KEY)
                model = genai.GenerativeModel(settings.GEMINI_MODEL)

                prompt = (
                    "You are a sentiment analyzer. Analyze the sentiment of the following restaurant review. "
                    "Respond with exactly two lines:\n"
                    "Line 1: Either 'positive', 'neutral', or 'negative'\n"
                    "Line 2: A float sentiment score between 0.0 (extremely negative) and 1.0 (extremely positive)\n"
                    f"Rating given: {rating} stars out of 5.\n"
                    f"Review comment: \"{comment}\"\n"
                    "Do not output anything else."
                )

                response = model.generate_content(prompt)
                if response and response.text:
                    lines = [line.strip().lower() for line in response.text.split("\n") if line.strip()]
                    if len(lines) >= 2:
                        label = lines[0]
                        if label in ["positive", "neutral", "negative"]:
                            sentiment = label
                        try:
                            score = float(lines[1])
                            score = max(0.0, min(1.0, score))
                        except ValueError:
                            pass
                        logger.info(f"Gemini review sentiment analyzed: {sentiment} ({score})")
                        return sentiment, score
            except Exception as e:
                logger.warning(f"Gemini Sentiment Analysis failed: {e}. Falling back to heuristic.")

        # Heuristic fallback
        comment_lower = comment.lower()
        positive_words = ['great', 'excellent', 'amazing', 'good', 'delicious', 'love', 'perfect', 'awesome', 'nice']
        negative_words = ['bad', 'terrible', 'awful', 'cold', 'late', 'rude', 'gross', 'slow', 'poor']
        
        pos_count = sum(1 for w in positive_words if w in comment_lower)
        neg_count = sum(1 for w in negative_words if w in comment_lower)
        
        score_base = (rating - 1) / 4.0  # 0.0 to 1.0
        
        if pos_count > neg_count or rating >= 4:
            sentiment = "positive"
            score = min(0.99, score_base + 0.1 + (pos_count * 0.05))
        elif neg_count > pos_count or rating <= 2:
            sentiment = "negative"
            score = max(0.01, score_base - 0.1 - (neg_count * 0.05))
        else:
            sentiment = "neutral"
            score = 0.5 + (random.uniform(-0.1, 0.1))
            
        return sentiment, round(score, 2)

    async def add_review(self, data: ReviewCreate) -> ReviewResponse:
        sentiment, score = await self._analyze_sentiment(data.rating, data.comment)
        
        review = Review(
            customer_id=data.customer_id,
            order_id=data.order_id,
            rating=data.rating,
            comment=data.comment,
            is_verified=data.is_verified,
            sentiment=sentiment,
            sentiment_score=score
        )
        created = await self.repo.create(review)
        logger.info(f"Added review with sentiment: {sentiment} ({score})")
        return ReviewResponse.model_validate(created)

    async def get_review(self, review_id: int) -> ReviewResponse:
        rev = await self.repo.get_by_id(review_id)
        if not rev:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        return ReviewResponse.model_validate(rev)

    async def get_all_reviews(
        self, page: int, per_page: int, search: Optional[str], sentiment_filter: Optional[str]
    ) -> Tuple[List[ReviewResponse], int]:
        reviews, total = await self.repo.get_all(page, per_page, search, sentiment_filter)
        return [ReviewResponse.model_validate(r) for r in reviews], total
        
    async def get_sentiment_stats(self) -> SentimentStats:
        stats = await self.repo.get_sentiment_stats()
        return SentimentStats(**stats)

    async def delete_review(self, review_id: int) -> dict:
        rev = await self.repo.get_by_id(review_id)
        if not rev:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        await self.repo.delete(review_id)
        logger.info(f"Deleted review ID: {review_id}")
        return {"message": "Review removed successfully", "success": True}
