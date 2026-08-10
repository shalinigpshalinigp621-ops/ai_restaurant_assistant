"""
Food Waste schemas for request validation and response serialization.
Aligned with FoodWaste model columns: quantity_wasted, cost, waste_date,
ingredient_name, unit (stored directly, not via relationship).
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class WasteBase(BaseModel):
    inventory_id: Optional[int] = None
    ingredient_name: str = Field(..., max_length=200)
    quantity_wasted: float = Field(..., gt=0)
    unit: str = Field(..., max_length=30)
    reason: Optional[str] = Field(None, max_length=200)


class WasteCreate(WasteBase):
    waste_date: Optional[datetime] = None


class WasteUpdate(BaseModel):
    quantity_wasted: Optional[float] = Field(None, gt=0)
    reason: Optional[str] = Field(None, max_length=200)
    ingredient_name: Optional[str] = Field(None, max_length=200)


class WasteResponse(BaseModel):
    id: int
    inventory_id: Optional[int] = None
    ingredient_name: str
    quantity_wasted: float
    unit: str
    reason: Optional[str] = None
    cost: float = 0.0
    waste_date: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class WasteListResponse(BaseModel):
    records: List[WasteResponse]
    total: int
    page: int
    per_page: int
