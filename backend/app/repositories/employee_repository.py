"""
Employee Repository — Data access layer for Employee management.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, or_
from app.models.all_models import Employee
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)


class EmployeeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, employee: Employee) -> Employee:
        self.db.add(employee)
        await self.db.flush()
        await self.db.refresh(employee)
        return employee

    async def get_by_id(self, employee_id: int) -> Optional[Employee]:
        result = await self.db.execute(
            select(Employee).where(Employee.id == employee_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        search: Optional[str] = None,
        department: Optional[str] = None,
        active_only: bool = False,
    ) -> Tuple[List[Employee], int]:
        query = select(Employee)
        count_query = select(func.count(Employee.id))

        if search:
            f = or_(
                Employee.name.ilike(f"%{search}%"),
                Employee.role.ilike(f"%{search}%"),
                Employee.phone.ilike(f"%{search}%"),
            )
            query = query.where(f)
            count_query = count_query.where(f)

        if department:
            query = query.where(Employee.department == department)
            count_query = count_query.where(Employee.department == department)

        if active_only:
            query = query.where(Employee.is_active == True)
            count_query = count_query.where(Employee.is_active == True)

        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(
            Employee.department.asc(), Employee.name.asc()
        )
        result = await self.db.execute(query)
        return list(result.scalars().all()), total

    async def update(self, employee_id: int, **kwargs) -> Optional[Employee]:
        await self.db.execute(
            update(Employee).where(Employee.id == employee_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(employee_id)

    async def delete(self, employee_id: int) -> bool:
        result = await self.db.execute(
            delete(Employee).where(Employee.id == employee_id)
        )
        await self.db.flush()
        return result.rowcount > 0
