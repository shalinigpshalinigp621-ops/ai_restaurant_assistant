"""
Customer Repository — Data access layer for Customers.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_
from app.models.all_models import Customer
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)

class CustomerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, customer: Customer) -> Customer:
        self.db.add(customer)
        await self.db.flush()
        await self.db.refresh(customer)
        return customer

    async def get_by_id(self, customer_id: int) -> Optional[Customer]:
        result = await self.db.execute(select(Customer).where(Customer.id == customer_id))
        return result.scalar_one_or_none()
        
    async def get_by_phone(self, phone: str) -> Optional[Customer]:
        result = await self.db.execute(select(Customer).where(Customer.phone == phone))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None
    ) -> Tuple[List[Customer], int]:
        query = select(Customer)
        count_query = select(func.count(Customer.id))

        if search:
            search_filter = or_(
                Customer.name.ilike(f"%{search}%"),
                Customer.phone.ilike(f"%{search}%"),
                Customer.email.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Paginate (alphabetical by name)
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(Customer.name.asc())
        
        result = await self.db.execute(query)
        customers = list(result.scalars().all())

        return customers, total

    async def update(self, customer_id: int, **kwargs) -> Optional[Customer]:
        await self.db.execute(
            update(Customer).where(Customer.id == customer_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(customer_id)

    async def delete(self, customer_id: int) -> bool:
        result = await self.db.execute(delete(Customer).where(Customer.id == customer_id))
        await self.db.flush()
        return result.rowcount > 0
