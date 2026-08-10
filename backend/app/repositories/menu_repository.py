"""
Menu Repository — Data access layer for Menu items.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from app.models.all_models import Menu, FoodCategory
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)

class MenuRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, menu_item: Menu) -> Menu:
        self.db.add(menu_item)
        await self.db.flush()
        await self.db.refresh(menu_item)
        return menu_item

    async def get_by_id(self, item_id: int) -> Optional[Menu]:
        result = await self.db.execute(select(Menu).where(Menu.id == item_id))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        category: Optional[FoodCategory] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Menu], int]:
        query = select(Menu)
        count_query = select(func.count(Menu.id))

        if category:
            query = query.where(Menu.category == category)
            count_query = count_query.where(Menu.category == category)
        
        if search:
            search_filter = Menu.name.ilike(f"%{search}%")
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Paginate
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(Menu.category, Menu.name)
        
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def update(self, item_id: int, **kwargs) -> Optional[Menu]:
        await self.db.execute(
            update(Menu).where(Menu.id == item_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(item_id)

    async def delete(self, item_id: int) -> bool:
        result = await self.db.execute(delete(Menu).where(Menu.id == item_id))
        await self.db.flush()
        return result.rowcount > 0
