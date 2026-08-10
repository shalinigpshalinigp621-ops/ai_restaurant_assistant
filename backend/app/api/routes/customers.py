"""
Customer API routes.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse, CustomerListResponse
from app.schemas.user import MessageResponse
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new customer",
)
async def create_customer(
    data: CustomerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CustomerService(db)
    return await service.create_customer(data)

@router.get(
    "/",
    response_model=CustomerListResponse,
    summary="List all customers",
)
async def list_customers(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CustomerService(db)
    customers, total = await service.get_all_customers(page, per_page, search)
    return CustomerListResponse(customers=customers, total=total, page=page, per_page=per_page)

@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Get customer details",
)
async def get_customer(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CustomerService(db)
    return await service.get_customer(customer_id)

@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    summary="Update customer details",
)
async def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = CustomerService(db)
    return await service.update_customer(customer_id, data)

@router.delete(
    "/{customer_id}",
    response_model=MessageResponse,
    summary="Delete a customer (Manager/Admin)",
)
async def delete_customer(
    customer_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = CustomerService(db)
    return await service.delete_customer(customer_id)
