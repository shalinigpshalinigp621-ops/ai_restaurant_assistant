"""
Review schemas for request validation and response serialization.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ReviewBase(BaseModel):
    customer_id: Optional[int] = None
    order_id: Optional[int] = None
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_verified: bool = False

class ReviewCreate(ReviewBase):
    pass

class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    is_verified: Optional[bool] = None

class ReviewResponse(ReviewBase):
    id: int
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]
    total: int
    page: int
    per_page: int
    
class SentimentStats(BaseModel):
    positive: int
    neutral: int
    negative: int
    total: int
    average_rating: float
