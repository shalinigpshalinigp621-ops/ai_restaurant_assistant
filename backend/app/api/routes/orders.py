"""
Order API routes.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.all_models import OrderStatus
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderListResponse
from app.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
)
async def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    # The order is created by the currently logged in user (staff member)
    return await service.create_order(current_user.id, data)

@router.get(
    "/",
    response_model=OrderListResponse,
    summary="List all orders",
)
async def list_orders(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status: Optional[OrderStatus] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    orders, total = await service.get_all_orders(page, per_page, status)
    return OrderListResponse(orders=orders, total=total, page=page, per_page=per_page)

@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get order details",
)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    return await service.get_order(order_id)

@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    summary="Update order status",
)
async def update_order_status(
    order_id: int,
    data: OrderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = OrderService(db)
    return await service.update_order_status(order_id, data)
