"""
Inventory Repository — Data access layer for Inventory tracking.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_
from app.models.all_models import Inventory
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)

class InventoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, item: Inventory) -> Inventory:
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def get_by_id(self, item_id: int) -> Optional[Inventory]:
        result = await self.db.execute(select(Inventory).where(Inventory.id == item_id))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        low_stock_only: bool = False
    ) -> Tuple[List[Inventory], int]:
        query = select(Inventory).where(Inventory.is_active == True)
        count_query = select(func.count(Inventory.id)).where(Inventory.is_active == True)

        if search:
            search_filter = or_(
                Inventory.ingredient_name.ilike(f"%{search}%"),
                Inventory.category.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
            
        if low_stock_only:
            # Reorder condition
            low_stock_filter = Inventory.quantity <= Inventory.reorder_level
            query = query.where(low_stock_filter)
            count_query = count_query.where(low_stock_filter)

        # Count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Paginate (alphabetical by category, then ingredient name)
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(Inventory.category.asc(), Inventory.ingredient_name.asc())
        
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def update(self, item_id: int, **kwargs) -> Optional[Inventory]:
        item = await self.get_by_id(item_id)
        if not item:
            return None
        for key, value in kwargs.items():
            if hasattr(item, key):
                setattr(item, key, value)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def delete(self, item_id: int) -> bool:
        item = await self.get_by_id(item_id)
        if not item:
            return False
        item.is_active = False
        await self.db.flush()
        return True
