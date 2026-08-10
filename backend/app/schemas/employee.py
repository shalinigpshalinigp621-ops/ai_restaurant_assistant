"""
Employee schemas for request validation and response serialization.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class EmployeeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    role: str = Field(..., max_length=100)
    department: str = Field(..., max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    salary: Optional[float] = Field(None, ge=0)
    shift: Optional[str] = Field(None, max_length=50)
    join_date: Optional[datetime] = None
    is_active: bool = True

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    role: Optional[str] = Field(None, max_length=100)
    department: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    salary: Optional[float] = Field(None, ge=0)
    shift: Optional[str] = Field(None, max_length=50)
    join_date: Optional[datetime] = None
    is_active: Optional[bool] = None

class EmployeeResponse(EmployeeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class EmployeeListResponse(BaseModel):
    employees: List[EmployeeResponse]
    total: int
    page: int
    per_page: int
