"""
Menu schemas for request validation and response serialization.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.all_models import FoodCategory

class MenuBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    category: FoodCategory
    price: float = Field(..., gt=0)
    cost_price: Optional[float] = Field(None, ge=0)
    image_url: Optional[str] = None
    is_available: bool = True
    is_vegetarian: bool = False
    calories: Optional[int] = Field(None, ge=0)
    preparation_time: Optional[int] = Field(None, ge=0, description="Prep time in minutes")

class MenuCreate(MenuBase):
    pass

class MenuUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[FoodCategory] = None
    price: Optional[float] = Field(None, gt=0)
    cost_price: Optional[float] = Field(None, ge=0)
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    is_vegetarian: Optional[bool] = None
    calories: Optional[int] = Field(None, ge=0)
    preparation_time: Optional[int] = Field(None, ge=0)

class MenuResponse(MenuBase):
    id: int
    total_orders: int
    rating: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class MenuListResponse(BaseModel):
    items: list[MenuResponse]
    total: int
    page: int
    per_page: int
