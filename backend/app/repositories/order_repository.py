"""
Order Repository — Data access layer for Orders and Order Items.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from app.models.all_models import Order, OrderItem, OrderStatus
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)

class OrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_order(self, order: Order, items: List[OrderItem]) -> Order:
        self.db.add(order)
        await self.db.flush()
        
        for item in items:
            item.order_id = order.id
            self.db.add(item)
            
        await self.db.flush()
        return await self.get_by_id(order.id)

    async def get_by_id(self, order_id: int) -> Optional[Order]:
        query = (
            select(Order)
            .options(selectinload(Order.items).selectinload(OrderItem.menu_item))
            .where(Order.id == order_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        status: Optional[OrderStatus] = None
    ) -> Tuple[List[Order], int]:
        query = select(Order).options(selectinload(Order.items).selectinload(OrderItem.menu_item))
        count_query = select(func.count(Order.id))

        if status:
            query = query.where(Order.status == status)
            count_query = count_query.where(Order.status == status)

        # Count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Paginate (latest first)
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(Order.created_at.desc())
        
        result = await self.db.execute(query)
        orders = list(result.scalars().all())

        return orders, total

    async def update_status(self, order_id: int, status: OrderStatus, notes: Optional[str] = None) -> Optional[Order]:
        values = {"status": status}
        if notes is not None:
            values["notes"] = notes

        await self.db.execute(
            update(Order).where(Order.id == order_id).values(**values)
        )
        await self.db.flush()
        return await self.get_by_id(order_id)
