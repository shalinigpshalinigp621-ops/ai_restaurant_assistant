"""
Inventory Service — Business logic for inventory management.
Automatically tracks restock times.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Tuple, List, Optional
from datetime import datetime, timezone
from app.models.all_models import Inventory
from app.repositories.inventory_repository import InventoryRepository
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse
import logging

logger = logging.getLogger(__name__)

class InventoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = InventoryRepository(db)

    async def create_item(self, data: InventoryCreate) -> InventoryResponse:
        item = Inventory(**data.model_dump())
        # If created with quantity > 0, set last_restocked
        if item.quantity > 0:
            item.last_restocked = datetime.now(timezone.utc)
            
        created = await self.repo.create(item)
        logger.info(f"Created inventory item: {created.item_name}")
        return InventoryResponse.model_validate(created)

    async def get_item(self, item_id: int) -> InventoryResponse:
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
        return InventoryResponse.model_validate(item)

    async def get_all_items(
        self, page: int, per_page: int, search: Optional[str], low_stock_only: bool
    ) -> Tuple[List[InventoryResponse], int]:
        items, total = await self.repo.get_all(page, per_page, search, low_stock_only)
        return [InventoryResponse.model_validate(i) for i in items], total

    async def update_item(self, item_id: int, data: InventoryUpdate) -> InventoryResponse:
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
        
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return InventoryResponse.model_validate(item)
            
        # Business Logic: Automatically update last_restocked if quantity is increased
        if 'quantity' in update_data and update_data['quantity'] > item.quantity:
            update_data['last_restocked'] = datetime.now(timezone.utc)
            
        updated = await self.repo.update(item_id, **update_data)
        return InventoryResponse.model_validate(updated)

    async def delete_item(self, item_id: int) -> dict:
        item = await self.repo.get_by_id(item_id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
            
        await self.repo.delete(item_id)
        logger.info(f"Deleted inventory item ID: {item_id}")
        return {"message": "Inventory item deleted successfully", "success": True}
