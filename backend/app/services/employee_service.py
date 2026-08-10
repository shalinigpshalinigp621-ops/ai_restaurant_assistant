"""
Employee Service — Business logic for employee management.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from typing import Tuple, List, Optional
from app.models.all_models import Employee
from app.repositories.employee_repository import EmployeeRepository
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse
import logging

logger = logging.getLogger(__name__)


class EmployeeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = EmployeeRepository(db)

    async def create_employee(self, data: EmployeeCreate) -> EmployeeResponse:
        employee = Employee(**data.model_dump())
        created = await self.repo.create(employee)
        logger.info(f"Created employee: {created.name}")
        return EmployeeResponse.model_validate(created)

    async def get_employee(self, employee_id: int) -> EmployeeResponse:
        emp = await self.repo.get_by_id(employee_id)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
            )
        return EmployeeResponse.model_validate(emp)

    async def get_all_employees(
        self,
        page: int,
        per_page: int,
        search: Optional[str],
        department: Optional[str],
        active_only: bool,
    ) -> Tuple[List[EmployeeResponse], int]:
        employees, total = await self.repo.get_all(
            page, per_page, search, department, active_only
        )
        return [EmployeeResponse.model_validate(e) for e in employees], total

    async def update_employee(
        self, employee_id: int, data: EmployeeUpdate
    ) -> EmployeeResponse:
        emp = await self.repo.get_by_id(employee_id)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
            )
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return EmployeeResponse.model_validate(emp)
        updated = await self.repo.update(employee_id, **update_data)
        return EmployeeResponse.model_validate(updated)

    async def delete_employee(self, employee_id: int) -> dict:
        emp = await self.repo.get_by_id(employee_id)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
            )
        await self.repo.delete(employee_id)
        logger.info(f"Deleted employee ID: {employee_id}")
        return {"message": "Employee removed successfully", "success": True}
