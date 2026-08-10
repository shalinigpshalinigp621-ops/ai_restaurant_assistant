"""
Dashboard Service
Aggregates metrics for the frontend dashboard using live database queries.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date
from datetime import datetime, timedelta, timezone
from app.models.all_models import Order, Customer, Inventory, OrderStatus, OrderType, FoodWaste
from app.schemas.dashboard import (
    DashboardResponse, StatCard, ChartData, ChartDataset, 
    LowStockItem, AIRecommendation
)
import logging

logger = logging.getLogger(__name__)

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_dashboard_data(self) -> DashboardResponse:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 1. Quick Stats
        
        # Today's Revenue
        rev_query = select(func.sum(Order.total_amount)).where(Order.created_at >= today_start)
        rev_result = await self.db.execute(rev_query)
        today_revenue = rev_result.scalar() or 0
        
        # Today's Orders
        ord_query = select(func.count(Order.id)).where(Order.created_at >= today_start)
        ord_result = await self.db.execute(ord_query)
        today_orders = ord_result.scalar() or 0
        
        # Total Customers
        cust_query = select(func.count(Customer.id))
        cust_result = await self.db.execute(cust_query)
        total_customers = cust_result.scalar() or 0
        
        # Today's Food Waste
        waste_query = select(func.sum(FoodWaste.quantity_wasted)).where(FoodWaste.created_at >= today_start)
        waste_result = await self.db.execute(waste_query)
        today_waste = waste_result.scalar() or 0
        
        quick_stats = [
            StatCard(
                label="Today's Revenue",
                value=f"₹{today_revenue:,.2f}",
                change="", # Not calculating historical changes for simplicity
                trend="up",
                icon="bi-currency-rupee",
                color="var(--color-success)"
            ),
            StatCard(
                label="Today's Orders",
                value=str(today_orders),
                change="",
                trend="up",
                icon="bi-bag-check-fill",
                color="var(--color-primary)"
            ),
            StatCard(
                label="Total Customers",
                value=str(total_customers),
                change="",
                trend="up",
                icon="bi-people-fill",
                color="var(--color-secondary)"
            ),
            StatCard(
                label="Food Waste Today",
                value=f"{today_waste:,.1f} kg",
                change="",
                trend="down", 
                icon="bi-recycle",
                color="var(--color-info)"
            )
        ]

        # 2. Charts Data (Last 7 days)
        days_labels = []
        revenue_data = []
        dine_in_data = []
        delivery_data = []
        
        for i in range(6, -1, -1):
            target_date = today_start - timedelta(days=i)
            next_date = target_date + timedelta(days=1)
            days_labels.append(target_date.strftime("%a"))
            
            # Revenue for day
            d_rev_q = select(func.sum(Order.total_amount)).where(Order.created_at >= target_date, Order.created_at < next_date)
            d_rev_res = await self.db.execute(d_rev_q)
            revenue_data.append(float(d_rev_res.scalar() or 0))
            
            # Dine in for day
            d_dine_q = select(func.count(Order.id)).where(Order.created_at >= target_date, Order.created_at < next_date, Order.notes.ilike('%dine%'))
            d_dine_res = await self.db.execute(d_dine_q)
            dine_in_data.append(int(d_dine_res.scalar() or 0))
            
            # Delivery for day
            d_del_q = select(func.count(Order.id)).where(Order.created_at >= target_date, Order.created_at < next_date, Order.notes.ilike('%delivery%'))
            d_del_res = await self.db.execute(d_del_q)
            delivery_data.append(int(d_del_res.scalar() or 0))

        revenue_chart = ChartData(
            labels=days_labels,
            datasets=[
                ChartDataset(
                    label="Revenue (₹)",
                    data=revenue_data,
                    borderColor="#10b981",
                    backgroundColor="rgba(16, 185, 129, 0.1)",
                    fill=True
                )
            ]
        )

        orders_chart = ChartData(
            labels=days_labels,
            datasets=[
                ChartDataset(
                    label="Dine-in",
                    data=dine_in_data,
                    borderColor="#f97316",
                    backgroundColor="#f97316"
                ),
                ChartDataset(
                    label="Delivery",
                    data=delivery_data,
                    borderColor="#8b5cf6",
                    backgroundColor="#8b5cf6"
                )
            ]
        )

        # 3. Low Stock Items
        low_stock_query = select(Inventory).where(Inventory.quantity <= Inventory.reorder_level).limit(10)
        low_stock_res = await self.db.execute(low_stock_query)
        low_stock_results = low_stock_res.scalars().all()
        
        low_stock_items = [
            LowStockItem(
                id=item.id,
                name=item.ingredient_name,
                quantity=float(item.quantity),
                unit=item.unit,
                reorder_level=float(item.reorder_level)
            ) for item in low_stock_results
        ]

        # 4. AI Recommendations (Derived from live data)
        ai_recommendations = []
        if len(low_stock_items) > 0:
            ai_recommendations.append(
                AIRecommendation(
                    title="Optimize Inventory: Critical Stock",
                    description=f"{len(low_stock_items)} items are currently at or below reorder levels. Restock immediately to avoid menu item unavailability.",
                    action_text="View Inventory",
                    action_link="/inventory",
                    type="warning"
                )
            )
        else:
             ai_recommendations.append(
                AIRecommendation(
                    title="Inventory Optimal",
                    description="All inventory items are currently well-stocked above reorder levels. No immediate action required.",
                    type="success"
                )
            )

        return DashboardResponse(
            quick_stats=quick_stats,
            revenue_chart=revenue_chart,
            orders_chart=orders_chart,
            customer_chart=revenue_chart,
            low_stock_items=low_stock_items,
            ai_recommendations=ai_recommendations
        )
