"""
Food Waste API routes.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.waste import WasteCreate, WasteResponse, WasteListResponse
from app.schemas.user import MessageResponse
from app.services.waste_service import WasteService

router = APIRouter(prefix="/waste", tags=["Food Waste"])

@router.post(
    "/",
    response_model=WasteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a food waste event",
)
async def log_waste(
    data: WasteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WasteService(db)
    return await service.log_waste(current_user.id, data)

@router.get(
    "/",
    response_model=WasteListResponse,
    summary="List all waste records",
)
async def list_waste(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WasteService(db)
    records, total = await service.get_all_waste(page, per_page, start_date, end_date)
    return WasteListResponse(records=records, total=total, page=page, per_page=per_page)

@router.get(
    "/{waste_id}",
    response_model=WasteResponse,
    summary="Get a specific waste record",
)
async def get_waste(
    waste_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = WasteService(db)
    return await service.get_waste(waste_id)

@router.delete(
    "/{waste_id}",
    response_model=MessageResponse,
    summary="Delete a waste record (Manager/Admin)",
)
async def delete_waste(
    waste_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = WasteService(db)
    return await service.delete_waste(waste_id)
