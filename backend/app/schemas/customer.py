"""
Customer schemas for request validation and response serialization.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    loyalty_points: int = Field(0, ge=0)
    preferences: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    loyalty_points: Optional[int] = Field(None, ge=0)
    preferences: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class CustomerListResponse(BaseModel):
    customers: List[CustomerResponse]
    total: int
    page: int
    per_page: int
