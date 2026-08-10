"""
Report Repository — Data access layer for saved Reports.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, desc
from app.models.all_models import Report
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)


class ReportRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, report: Report) -> Report:
        self.db.add(report)
        await self.db.flush()
        await self.db.refresh(report)
        return report

    async def get_by_id(self, report_id: int) -> Optional[Report]:
        result = await self.db.execute(
            select(Report).where(Report.id == report_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        report_type: Optional[str] = None,
    ) -> Tuple[List[Report], int]:
        query = select(Report)
        count_query = select(func.count(Report.id))

        if report_type:
            query = query.where(Report.report_type == report_type)
            count_query = count_query.where(Report.report_type == report_type)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(desc(Report.created_at))
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def delete(self, report_id: int) -> bool:
        result = await self.db.execute(
            delete(Report).where(Report.id == report_id)
        )
        await self.db.flush()
        return result.rowcount > 0
