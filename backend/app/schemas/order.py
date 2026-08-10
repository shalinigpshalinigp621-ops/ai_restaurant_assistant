"""
Order schemas for request validation and response serialization.
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.all_models import OrderStatus, OrderType
from app.schemas.menu import MenuResponse

class OrderItemBase(BaseModel):
    menu_item_id: int
    quantity: int = Field(..., gt=0)
    notes: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemResponse(OrderItemBase):
    id: int
    price_at_time: float
    menu_item: Optional[MenuResponse] = None

    model_config = {"from_attributes": True}

class OrderBase(BaseModel):
    customer_id: Optional[int] = None
    order_type: OrderType
    table_number: Optional[str] = None
    discount_amount: float = Field(0.0, ge=0)
    notes: Optional[str] = None

class OrderCreate(OrderBase):
    items: List[OrderItemCreate] = Field(..., min_length=1)

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None

class OrderResponse(OrderBase):
    id: int
    user_id: int
    status: OrderStatus
    subtotal: float
    tax_amount: float
    total_amount: float
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

    model_config = {"from_attributes": True}

class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    page: int
    per_page: int
