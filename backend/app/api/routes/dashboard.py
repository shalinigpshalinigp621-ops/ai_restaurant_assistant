"""
Dashboard API Routes
Returns aggregated metrics for the dashboard UI.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get(
    "/",
    response_model=DashboardResponse,
    summary="Get aggregated dashboard metrics",
)
async def get_dashboard_metrics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all necessary data for the main dashboard view:
    - Quick Stats (Revenue, Orders, Customers, Waste)
    - Charts (Revenue trend, Orders trend)
    - Low stock alerts
    - AI-generated recommendations
    
    Requires an authenticated user.
    """
    service = DashboardService(db)
    return await service.get_dashboard_data()
