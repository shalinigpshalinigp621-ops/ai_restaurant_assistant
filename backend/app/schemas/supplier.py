"""
Supplier schemas for request validation and response serialization.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class SupplierBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    contact_person: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    items_supplied: Optional[str] = None          # comma-separated or free text
    payment_terms: Optional[str] = Field(None, max_length=200)
    delivery_schedule: Optional[str] = Field(None, max_length=200)
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    contact_person: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    items_supplied: Optional[str] = None
    payment_terms: Optional[str] = Field(None, max_length=200)
    delivery_schedule: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class SupplierListResponse(BaseModel):
    suppliers: List[SupplierResponse]
    total: int
    page: int
    per_page: int
