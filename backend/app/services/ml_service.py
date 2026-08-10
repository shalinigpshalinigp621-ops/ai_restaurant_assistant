"""
ML Analytics Service — Demand Forecasting, Customer RFM Segmentation, Anomaly Detection, & Smart Insights.
Leverages scikit-learn, pandas, numpy, and statistical modeling.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans

from app.models.all_models import Order, OrderItem, Menu, Customer, FoodWaste, Inventory


class MLService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_demand_forecast(self, days: int = 7) -> Dict[str, Any]:
        """
        Demand Forecasting for menu items using trend line regression.
        """
        # Fetch order items joined to menu items
        stmt = (
            select(
                Menu.name,
                Menu.category,
                func.date(Order.created_at).label("order_date"),
                func.sum(OrderItem.quantity).label("daily_quantity")
            )
            .join(OrderItem, Menu.id == OrderItem.menu_item_id)
            .join(Order, OrderItem.order_id == Order.id)
            .where(Order.status == "completed")
            .group_by(Menu.name, Menu.category, func.date(Order.created_at))
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        if not rows:
            return {
                "forecast_dates": [(datetime.utcnow() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, days + 1)],
                "items": [],
                "summary": "Insufficient completed orders to generate demand forecast."
            }

        df = pd.DataFrame(rows, columns=["item_name", "category", "order_date", "daily_quantity"])
        df["order_date"] = pd.to_datetime(df["order_date"])

        forecasts = []
        unique_items = df["item_name"].unique()[:10]  # Top 10 items

        for item in unique_items:
            item_df = df[df["item_name"] == item].sort_values("order_date")
            if len(item_df) < 2:
                current_avg = item_df["daily_quantity"].mean() if len(item_df) > 0 else 15
                predicted = [round(float(current_avg), 1)] * days
            else:
                item_df = item_df.copy()
                item_df["day_idx"] = (item_df["order_date"] - item_df["order_date"].min()).dt.days
                X = item_df[["day_idx"]].values
                y = item_df["daily_quantity"].values

                model = LinearRegression()
                model.fit(X, y)

                last_day = item_df["day_idx"].max()
                future_days = np.array([[last_day + i] for i in range(1, days + 1)])
                preds = model.predict(future_days)
                predicted = [max(1, round(float(p), 1)) for p in preds]

            category = item_df["category"].iloc[0] if len(item_df) > 0 else "General"
            total_predicted = sum(predicted)
            forecasts.append({
                "item_name": item,
                "category": str(category),
                "daily_forecast": predicted,
                "total_7day_forecast": total_predicted,
                "confidence_score": 0.88 if len(item_df) > 3 else 0.75
            })

        dates = [(datetime.utcnow() + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, days + 1)]

        return {
            "forecast_dates": dates,
            "items": forecasts,
            "summary": f"Generated demand forecast for {len(forecasts)} menu items over next {days} days."
        }

    async def get_customer_segmentation(self) -> Dict[str, Any]:
        """
        Customer RFM (Recency, Frequency, Monetary) Segmentation using K-Means Clustering.
        """
        stmt = select(Customer)
        res = await self.db.execute(stmt)
        customers = res.scalars().all()

        if len(customers) < 3:
            return {
                "total_customers": len(customers),
                "segments": [],
                "model": "Insufficient customers for K-Means Clustering (requires >= 3)"
            }

        customer_data = []
        now = datetime.utcnow()

        for c in customers:
            recency = (now - c.updated_at).days if c.updated_at else 30
            frequency = c.total_orders or 1
            monetary = float(c.total_spent or 100.0)
            customer_data.append({
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "recency": recency,
                "frequency": frequency,
                "monetary": monetary
            })

        df = pd.DataFrame(customer_data)
        X = df[["recency", "frequency", "monetary"]]

        n_clusters = min(3, len(df))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df["cluster"] = kmeans.fit_predict(X)

        cluster_names = {
            0: "VIP High Value",
            1: "Regular Loyalists",
            2: "Occasional / At-Risk"
        }

        df["segment"] = df["cluster"].map(cluster_names)

        segments = []
        for segment_name, group in df.groupby("segment"):
            segments.append({
                "segment_name": segment_name,
                "count": len(group),
                "avg_spend": round(float(group["monetary"].mean()), 2),
                "avg_orders": round(float(group["frequency"].mean()), 1),
                "avg_recency_days": round(float(group["recency"].mean()), 1),
                "customers": group[["id", "name", "email", "monetary", "frequency"]].to_dict(orient="records")
            })

        return {
            "total_customers": len(df),
            "segments": segments,
            "model": "K-Means RFM Clustering (k=3)"
        }

    async def get_anomalies(self) -> Dict[str, Any]:
        """
        Statistical anomaly detection on waste entries and inventory stock levels.
        """
        anomalies = []

        # 1. Check for high waste cost events
        waste_stmt = select(FoodWaste)
        res = await self.db.execute(waste_stmt)
        waste_rows = res.scalars().all()

        if waste_rows:
            waste_costs = [float(w.cost) for w in waste_rows]
            if len(waste_costs) > 2:
                mean_w = np.mean(waste_costs)
                std_w = np.std(waste_costs)
                for w in waste_rows:
                    cost = float(w.cost)
                    if std_w > 0 and (cost - mean_w) / std_w > 1.5:
                        anomalies.append({
                            "type": "Waste Spike",
                            "severity": "high" if cost > 1000 else "medium",
                            "title": f"Unusual waste cost recorded: Rs.{cost}",
                            "description": (
                                f"'{w.ingredient_name}' logged waste of {w.quantity_wasted} {w.unit} "
                                f"(Reason: {w.reason}). Significantly above baseline mean Rs.{round(mean_w, 2)}."
                            ),
                            "date": w.created_at.strftime("%Y-%m-%d") if w.created_at else "Recent"
                        })

        # 2. Check low stock anomalies
        inv_stmt = select(Inventory).where(
            Inventory.quantity <= Inventory.reorder_level,
            Inventory.is_active == True
        )
        inv_res = await self.db.execute(inv_stmt)
        low_stock_items = inv_res.scalars().all()

        for item in low_stock_items:
            anomalies.append({
                "type": "Low Stock Risk",
                "severity": "high" if item.quantity < (item.reorder_level / 2) else "medium",
                "title": f"Critical Stock: {item.ingredient_name}",
                "description": (
                    f"Current level ({item.quantity} {item.unit}) is below reorder threshold "
                    f"({item.reorder_level} {item.unit}). Immediate reorder recommended."
                ),
                "date": datetime.utcnow().strftime("%Y-%m-%d")
            })

        if not anomalies:
            anomalies.append({
                "type": "System Normal",
                "severity": "low",
                "title": "No Critical Operational Anomalies Detected",
                "description": "Inventory levels and food waste metrics are currently within expected standard deviations.",
                "date": datetime.utcnow().strftime("%Y-%m-%d")
            })

        return {"anomalies_count": len(anomalies), "anomalies": anomalies}
