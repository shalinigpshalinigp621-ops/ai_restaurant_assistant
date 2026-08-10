"""
ML Analytics & Intelligence API Routes.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.ml_service import MLService

router = APIRouter(prefix="/analytics", tags=["ML Analytics"])


@router.get("/demand-forecast")
async def get_demand_forecast(
    days: int = Query(7, ge=1, le=30),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get 7-day demand forecast for menu items using trend line regression.
    """
    service = MLService(db)
    return await service.get_demand_forecast(days=days)


@router.get("/customer-segments")
async def get_customer_segmentation(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get customer segmentation breakdown using RFM + K-Means Clustering.
    """
    service = MLService(db)
    return await service.get_customer_segmentation()


@router.get("/anomalies")
async def get_anomalies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get operational and inventory waste anomalies.
    """
    service = MLService(db)
    return await service.get_anomalies()
