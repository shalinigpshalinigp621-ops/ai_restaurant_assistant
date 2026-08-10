"""
Reports API routes.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.report import (
    ReportGenerateRequest, ReportResponse, ReportListResponse
)
from app.schemas.user import MessageResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports & Analytics"])


@router.post(
    "/generate",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate and save a new business report (Manager/Admin)",
)
async def generate_report(
    data: ReportGenerateRequest,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).generate_report(current_user.id, data)


@router.get(
    "/",
    response_model=ReportListResponse,
    summary="List generated reports",
)
async def list_reports(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    report_type: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reports, total = await ReportService(db).get_all_reports(page, per_page, report_type)
    return ReportListResponse(
        reports=reports, total=total, page=page, per_page=per_page
    )


@router.get(
    "/{report_id}",
    response_model=ReportResponse,
    summary="Get report contents",
)
async def get_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).get_report(report_id)


@router.delete(
    "/{report_id}",
    response_model=MessageResponse,
    summary="Delete a saved report (Manager/Admin)",
)
async def delete_report(
    report_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService(db).delete_report(report_id)
