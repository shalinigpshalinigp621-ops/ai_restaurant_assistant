"""
AI Repository — Data access layer for AI Assistant conversation logs.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.all_models import AILog
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)


class AIRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_interaction(self, ai_log: AILog) -> AILog:
        self.db.add(ai_log)
        await self.db.flush()
        await self.db.refresh(ai_log)
        return ai_log

    async def get_logs(
        self,
        page: int = 1,
        per_page: int = 20,
        user_id: Optional[int] = None,
    ) -> Tuple[List[AILog], int]:
        query = select(AILog)
        count_query = select(func.count(AILog.id))

        if user_id:
            query = query.where(AILog.user_id == user_id)
            count_query = count_query.where(AILog.user_id == user_id)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(desc(AILog.created_at))
        result = await self.db.execute(query)
        return list(result.scalars().all()), total
