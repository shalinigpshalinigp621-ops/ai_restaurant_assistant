"""
Inventory API routes.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryResponse, InventoryListResponse
from app.schemas.user import MessageResponse
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.post(
    "",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
@router.post(
    "/",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new inventory item (Manager/Admin)",
)
async def create_inventory_item(
    data: InventoryCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = InventoryService(db)
    return await service.create_item(data)

@router.get(
    "",
    response_model=InventoryListResponse,
    include_in_schema=False
)
@router.get(
    "/",
    response_model=InventoryListResponse,
    summary="List all inventory items",
)
async def list_inventory_items(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    low_stock_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InventoryService(db)
    items, total = await service.get_all_items(page, per_page, search, low_stock_only)
    return InventoryListResponse(items=items, total=total, page=page, per_page=per_page)

@router.get(
    "/{item_id}",
    response_model=InventoryResponse,
    summary="Get inventory item details",
)
async def get_inventory_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = InventoryService(db)
    return await service.get_item(item_id)

@router.put(
    "/{item_id}",
    response_model=InventoryResponse,
    summary="Update inventory item (Manager/Admin)",
)
async def update_inventory_item(
    item_id: int,
    data: InventoryUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = InventoryService(db)
    return await service.update_item(item_id, data)

@router.delete(
    "/{item_id}",
    response_model=MessageResponse,
    summary="Delete an inventory item (Manager/Admin)",
)
async def delete_inventory_item(
    item_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = InventoryService(db)
    return await service.delete_item(item_id)
