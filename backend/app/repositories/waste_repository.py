"""
Food Waste Repository — Data access layer for Waste tracking.
Aligned with FoodWaste model columns: waste_date (not record_date).
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, desc
from app.models.all_models import FoodWaste
from typing import Optional, List, Tuple
from datetime import date
import logging

logger = logging.getLogger(__name__)

class WasteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, waste: FoodWaste) -> FoodWaste:
        self.db.add(waste)
        await self.db.flush()
        await self.db.refresh(waste)
        return waste

    async def get_by_id(self, waste_id: int) -> Optional[FoodWaste]:
        query = select(FoodWaste).where(FoodWaste.id == waste_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Tuple[List[FoodWaste], int]:
        query = select(FoodWaste)
        count_query = select(func.count(FoodWaste.id))

        if start_date:
            query = query.where(FoodWaste.waste_date >= start_date)
            count_query = count_query.where(FoodWaste.waste_date >= start_date)
        if end_date:
            query = query.where(FoodWaste.waste_date <= end_date)
            count_query = count_query.where(FoodWaste.waste_date <= end_date)

        # Count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Paginate (latest first)
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(desc(FoodWaste.waste_date), desc(FoodWaste.created_at))
        
        result = await self.db.execute(query)
        records = list(result.scalars().all())

        return records, total

    async def update(self, waste_id: int, **kwargs) -> Optional[FoodWaste]:
        await self.db.execute(
            update(FoodWaste).where(FoodWaste.id == waste_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(waste_id)

    async def delete(self, waste_id: int) -> bool:
        result = await self.db.execute(delete(FoodWaste).where(FoodWaste.id == waste_id))
        await self.db.flush()
        return result.rowcount > 0
