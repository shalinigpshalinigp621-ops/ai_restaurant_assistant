"""
Menu API routes.
"""
from fastapi import APIRouter, Depends, status, Query, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import os
import uuid
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.models.all_models import FoodCategory
from app.schemas.menu import MenuCreate, MenuUpdate, MenuResponse, MenuListResponse
from app.schemas.user import MessageResponse
from app.services.menu_service import MenuService

router = APIRouter(prefix="/menu", tags=["Menu"])

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload a menu item image (Manager/Admin)",
)
async def upload_menu_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_manager),
):
    # Ensure static directory exists
    os.makedirs("static/menu", exist_ok=True)
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = f"static/menu/{filename}"
    
    # Save file
    try:
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
        
    return {"image_url": f"/static/menu/{filename}"}

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
