"""
Supplier API routes. All writes are restricted to manager/admin.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse
)
from app.schemas.user import MessageResponse
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.post(
    "/",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new supplier (Manager/Admin)",
)
async def create_supplier(
    data: SupplierCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    return await SupplierService(db).create_supplier(data)


@router.get(
    "/",
    response_model=SupplierListResponse,
    summary="List all suppliers",
)
async def list_suppliers(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    active_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    suppliers, total = await SupplierService(db).get_all_suppliers(
        page, per_page, search, active_only
    )
    return SupplierListResponse(
        suppliers=suppliers, total=total, page=page, per_page=per_page
    )


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Get supplier details",
)
async def get_supplier(
    supplier_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await SupplierService(db).get_supplier(supplier_id)


@router.put(
    "/{supplier_id}",
    response_model=SupplierResponse,
    summary="Update supplier info (Manager/Admin)",
)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    return await SupplierService(db).update_supplier(supplier_id, data)


@router.delete(
    "/{supplier_id}",
    response_model=MessageResponse,
    summary="Remove a supplier (Manager/Admin)",
)
async def delete_supplier(
    supplier_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    return await SupplierService(db).delete_supplier(supplier_id)
