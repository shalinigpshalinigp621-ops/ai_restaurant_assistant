"""
Dashboard schemas.
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class StatCard(BaseModel):
    label: str
    value: str
    change: str
    trend: str  # "up" or "down"
    icon: str
    color: str

class ChartDataPoint(BaseModel):
    label: str
    value: float

class ChartDataset(BaseModel):
    label: str
    data: List[float]
    borderColor: Optional[str] = None
    backgroundColor: Optional[str] = None
    fill: Optional[bool] = False

class ChartData(BaseModel):
    labels: List[str]
    datasets: List[ChartDataset]

class LowStockItem(BaseModel):
    id: int
    name: str
    quantity: float
    unit: str
    reorder_level: float

class AIRecommendation(BaseModel):
    title: str
    description: str
    action_text: Optional[str] = None
    action_link: Optional[str] = None
    type: str # success, warning, info, danger

class DashboardResponse(BaseModel):
    quick_stats: List[StatCard]
    revenue_chart: ChartData
    orders_chart: ChartData
    customer_chart: ChartData
    low_stock_items: List[LowStockItem]
    ai_recommendations: List[AIRecommendation]
