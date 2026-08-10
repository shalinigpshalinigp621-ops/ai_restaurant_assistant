"""
Report Service — Business logic for generating aggregated business reports.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from sqlalchemy import select, func, and_
from typing import Tuple, List, Optional
from datetime import datetime
from app.models.all_models import Report, Order, FoodWaste, Inventory
from app.repositories.report_repository import ReportRepository
from app.schemas.report import ReportGenerateRequest, ReportResponse
import logging

logger = logging.getLogger(__name__)


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReportRepository(db)

    async def _generate_sales_content(self, start: datetime, end: datetime) -> dict:
        """Aggregates sales data between dates."""
        query = select(
            func.count(Order.id).label("total_orders"),
            func.sum(Order.total_amount).label("gross_revenue"),
            func.sum(Order.discount).label("total_discounts"),
            func.sum(Order.tax).label("total_tax")
        ).where(and_(Order.created_at >= start, Order.created_at <= end))
        
        result = await self.db.execute(query)
        row = result.fetchone()
        
        gross = float(row.gross_revenue or 0.0)
        discounts = float(row.total_discounts or 0.0)
        
        return {
            "metrics": {
                "total_orders": row.total_orders or 0,
                "gross_revenue": gross,
                "total_discounts": discounts,
                "total_tax": float(row.total_tax or 0.0),
                "net_revenue": gross - discounts
            }
        }

    async def _generate_waste_content(self, start: datetime, end: datetime) -> dict:
        """Aggregates waste data between dates."""
        query = select(
            func.count(FoodWaste.id).label("total_events"),
            func.sum(FoodWaste.quantity_wasted).label("total_quantity"),
            func.sum(FoodWaste.cost).label("total_cost")
        ).where(and_(FoodWaste.waste_date >= start, FoodWaste.waste_date <= end))
        
        result = await self.db.execute(query)
        row = result.fetchone()
        
        return {
            "metrics": {
                "total_waste_events": row.total_events or 0,
                "total_wasted_quantity": float(row.total_quantity or 0.0),
                "total_financial_loss": float(row.total_cost or 0.0)
            }
        }

    async def _generate_inventory_content(self) -> dict:
        """Aggregates current inventory snapshot."""
        query = select(
            func.count(Inventory.id).label("total_items"),
            func.sum(Inventory.quantity * Inventory.unit_cost).label("total_value")
        ).where(Inventory.is_active == True)
        
        result = await self.db.execute(query)
        row = result.fetchone()
        
        low_stock_query = select(func.count(Inventory.id)).where(
            and_(Inventory.is_active == True, Inventory.quantity <= Inventory.reorder_level)
        )
        ls_res = await self.db.execute(low_stock_query)
        low_stock = ls_res.scalar_one() or 0
        
        return {
            "metrics": {
                "total_items_tracked": row.total_items or 0,
                "total_inventory_value": float(row.total_value or 0.0),
                "items_needing_reorder": low_stock
            }
        }

    async def generate_report(self, user_id: int, request: ReportGenerateRequest) -> ReportResponse:
        content = {}
        title = f"{request.report_type.replace('_', ' ').title()} Report"
        
        start = request.period_start or datetime.now()
        end = request.period_end or datetime.now()
        
        if request.report_type == 'sales':
            content = await self._generate_sales_content(start, end)
        elif request.report_type == 'waste':
            content = await self._generate_waste_content(start, end)
        elif request.report_type == 'inventory':
            content = await self._generate_inventory_content()
        else:
            raise HTTPException(status_code=400, detail="Invalid report type requested.")

        report = Report(
            title=title,
            report_type=request.report_type,
            period_start=request.period_start,
            period_end=request.period_end,
            content=content,
            generated_by=user_id
        )
        
        created = await self.repo.create(report)
        logger.info(f"Generated report: {title} by User ID {user_id}")
        return ReportResponse.model_validate(created)

    async def get_report(self, report_id: int) -> ReportResponse:
        rep = await self.repo.get_by_id(report_id)
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        return ReportResponse.model_validate(rep)

    async def get_all_reports(
        self, page: int, per_page: int, report_type: Optional[str]
    ) -> Tuple[List[ReportResponse], int]:
        reports, total = await self.repo.get_all(page, per_page, report_type)
        return [ReportResponse.model_validate(r) for r in reports], total

    async def delete_report(self, report_id: int) -> dict:
        rep = await self.repo.get_by_id(report_id)
        if not rep:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
        await self.repo.delete(report_id)
        return {"message": "Report deleted successfully", "success": True}
