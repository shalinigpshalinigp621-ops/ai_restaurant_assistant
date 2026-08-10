"""
Report schemas for generating and retrieving business analytics.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReportBase(BaseModel):
    title: str = Field(..., max_length=300)
    report_type: str = Field(..., max_length=50) # e.g. daily_sales, inventory_status, waste_analysis
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

class ReportGenerateRequest(BaseModel):
    report_type: str = Field(..., max_length=50)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

class ReportResponse(ReportBase):
    id: int
    content: Dict[str, Any]
    generated_by: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int
    page: int
    per_page: int
