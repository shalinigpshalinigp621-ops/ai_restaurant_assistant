"""
Inventory schemas for request validation and response serialization.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class InventoryBase(BaseModel):
    item_name: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., max_length=100)
    quantity: float = Field(..., ge=0)
    unit: str = Field(..., max_length=20)
    reorder_level: float = Field(..., ge=0)
    unit_price: Optional[float] = Field(None, ge=0)

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    item_name: Optional[str] = Field(None, min_length=2, max_length=150)
    category: Optional[str] = Field(None, max_length=100)
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=20)
    reorder_level: Optional[float] = Field(None, ge=0)
    unit_price: Optional[float] = Field(None, ge=0)

class InventoryResponse(InventoryBase):
    id: int
    last_restocked: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class InventoryListResponse(BaseModel):
    items: List[InventoryResponse]
    total: int
    page: int
    per_page: int
