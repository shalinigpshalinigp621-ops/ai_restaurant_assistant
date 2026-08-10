"""
Menu API routes.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.models.all_models import FoodCategory
from app.schemas.menu import MenuCreate, MenuUpdate, MenuResponse, MenuListResponse
from app.schemas.user import MessageResponse
from app.services.menu_service import MenuService

router = APIRouter(prefix="/menu", tags=["Menu"])

@router.post(
    "/",
    response_model=MenuResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new menu item (Manager/Admin)",
)
async def create_menu_item(
    data: MenuCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = MenuService(db)
    return await service.create_item(data)

@router.get(
    "/",
    response_model=MenuListResponse,
    summary="List all menu items",
)
async def list_menu_items(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    category: Optional[FoodCategory] = Query(default=None),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MenuService(db)
    items, total = await service.get_all_items(page, per_page, category, search)
    return MenuListResponse(items=items, total=total, page=page, per_page=per_page)

@router.get(
    "/{item_id}",
    response_model=MenuResponse,
    summary="Get menu item details",
)
async def get_menu_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = MenuService(db)
    return await service.get_item(item_id)

@router.put(
    "/{item_id}",
    response_model=MenuResponse,
    summary="Update a menu item (Manager/Admin)",
)
async def update_menu_item(
    item_id: int,
    data: MenuUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = MenuService(db)
    return await service.update_item(item_id, data)

@router.delete(
    "/{item_id}",
    response_model=MessageResponse,
    summary="Delete a menu item (Manager/Admin)",
)
async def delete_menu_item(
    item_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = MenuService(db)
    return await service.delete_item(item_id)
