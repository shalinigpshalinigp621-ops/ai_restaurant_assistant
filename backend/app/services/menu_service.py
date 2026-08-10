"""
Menu Service — Business logic for menu management.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Optional, Tuple, List
from app.models.all_models import Menu, FoodCategory
from app.repositories.menu_repository import MenuRepository
from app.schemas.menu import MenuCreate, MenuUpdate, MenuResponse
import logging

logger = logging.getLogger(__name__)

class MenuService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MenuRepository(db)

    async def create_item(self, data: MenuCreate) -> MenuResponse:
        menu_item = Menu(**data.model_dump())
        created = await self.repo.create(menu_item)
        logger.info(f"Created menu item: {created.name}")
        return MenuResponse.model_validate(created)

    async def get_item(self, item_id: int) -> MenuResponse:
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
        return MenuResponse.model_validate(item)

    async def get_all_items(
        self, page: int, per_page: int, category: Optional[FoodCategory], search: Optional[str]
    ) -> Tuple[List[MenuResponse], int]:
        items, total = await self.repo.get_all(page, per_page, category, search)
        return [MenuResponse.model_validate(i) for i in items], total

    async def update_item(self, item_id: int, data: MenuUpdate) -> MenuResponse:
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
        
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return MenuResponse.model_validate(item)
            
        updated = await self.repo.update(item_id, **update_data)
        return MenuResponse.model_validate(updated)

    async def delete_item(self, item_id: int) -> dict:
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
            
        await self.repo.delete(item_id)
        logger.info(f"Deleted menu item ID: {item_id}")
        return {"message": "Menu item deleted successfully", "success": True}
