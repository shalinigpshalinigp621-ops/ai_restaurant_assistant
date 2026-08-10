"""
Review API routes for customer feedback and sentiment analysis.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.review import (
    ReviewCreate, ReviewResponse, ReviewListResponse, SentimentStats
)
from app.schemas.user import MessageResponse
from app.services.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["Reviews & Sentiment"])


@router.post(
    "/",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new customer review",
)
async def create_review(
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
):
    # Note: In a real app, this might be open to public or logged-in customers.
    # For now, it's an internal tool to log reviews gathered externally.
    return await ReviewService(db).add_review(data)


@router.get(
    "/stats",
    response_model=SentimentStats,
    summary="Get aggregated sentiment statistics",
)
async def get_review_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReviewService(db).get_sentiment_stats()


@router.get(
    "/",
    response_model=ReviewListResponse,
    summary="List all reviews with optional sentiment filtering",
)
async def list_reviews(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    sentiment: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reviews, total = await ReviewService(db).get_all_reviews(
        page, per_page, search, sentiment
    )
    return ReviewListResponse(
        reviews=reviews, total=total, page=page, per_page=per_page
    )


@router.get(
    "/{review_id}",
    response_model=ReviewResponse,
    summary="Get specific review details",
)
async def get_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReviewService(db).get_review(review_id)


@router.delete(
    "/{review_id}",
    response_model=MessageResponse,
    summary="Remove a review (Manager/Admin)",
)
async def delete_review(
    review_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    return await ReviewService(db).delete_review(review_id)
