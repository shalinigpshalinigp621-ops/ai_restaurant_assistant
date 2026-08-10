"""
Supplier Repository — Data access layer for Supplier management.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_
from app.models.all_models import Supplier
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)


class SupplierRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, supplier: Supplier) -> Supplier:
        self.db.add(supplier)
        await self.db.flush()
        await self.db.refresh(supplier)
        return supplier

    async def get_by_id(self, supplier_id: int) -> Optional[Supplier]:
        result = await self.db.execute(
            select(Supplier).where(Supplier.id == supplier_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        active_only: bool = False,
    ) -> Tuple[List[Supplier], int]:
        query = select(Supplier)
        count_query = select(func.count(Supplier.id))

        if search:
            f = or_(
                Supplier.name.ilike(f"%{search}%"),
                Supplier.contact_person.ilike(f"%{search}%"),
                Supplier.items_supplied.ilike(f"%{search}%"),
            )
            query = query.where(f)
            count_query = count_query.where(f)

        if active_only:
            query = query.where(Supplier.is_active == True)
            count_query = count_query.where(Supplier.is_active == True)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(Supplier.name.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def update(self, supplier_id: int, **kwargs) -> Optional[Supplier]:
        await self.db.execute(
            update(Supplier).where(Supplier.id == supplier_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(supplier_id)

    async def delete(self, supplier_id: int) -> bool:
        result = await self.db.execute(
            delete(Supplier).where(Supplier.id == supplier_id)
        )
        await self.db.flush()
        return result.rowcount > 0
