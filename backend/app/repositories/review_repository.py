"""
Review Repository — Data access layer for Customer Reviews.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, desc, or_
from app.models.all_models import Review
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)


class ReviewRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, review: Review) -> Review:
        self.db.add(review)
        await self.db.flush()
        await self.db.refresh(review)
        return review

    async def get_by_id(self, review_id: int) -> Optional[Review]:
        result = await self.db.execute(
            select(Review).where(Review.id == review_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        sentiment_filter: Optional[str] = None,
    ) -> Tuple[List[Review], int]:
        query = select(Review)
        count_query = select(func.count(Review.id))

        if search:
            query = query.where(Review.comment.ilike(f"%{search}%"))
            count_query = count_query.where(Review.comment.ilike(f"%{search}%"))

        if sentiment_filter:
            query = query.where(Review.sentiment == sentiment_filter)
            count_query = count_query.where(Review.sentiment == sentiment_filter)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(desc(Review.created_at))
        result = await self.db.execute(query)
        return list(result.scalars().all()), total
        
    async def get_sentiment_stats(self) -> dict:
        """Returns counts for positive, neutral, negative and average rating."""
        # This is a bit complex for simple SQLAlchemy async without group_by trickery,
        # so we'll do simple counts
        
        pos_query = select(func.count(Review.id)).where(Review.sentiment == 'positive')
        neu_query = select(func.count(Review.id)).where(Review.sentiment == 'neutral')
        neg_query = select(func.count(Review.id)).where(Review.sentiment == 'negative')
        avg_query = select(func.avg(Review.rating))
        
        pos_res = await self.db.execute(pos_query)
        neu_res = await self.db.execute(neu_query)
        neg_res = await self.db.execute(neg_query)
        avg_res = await self.db.execute(avg_query)
        
        positive = pos_res.scalar_one() or 0
        neutral = neu_res.scalar_one() or 0
        negative = neg_res.scalar_one() or 0
        total = positive + neutral + negative
        avg = avg_res.scalar_one() or 0.0
        
        return {
            "positive": positive,
            "neutral": neutral,
            "negative": negative,
            "total": total,
            "average_rating": float(avg)
        }

    async def delete(self, review_id: int) -> bool:
        result = await self.db.execute(
            delete(Review).where(Review.id == review_id)
        )
        await self.db.flush()
        return result.rowcount > 0
