"""
Employee API routes. Restricted to admin/manager for writes.
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_manager
from app.models.user import User
from app.schemas.employee import (
    EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeListResponse
)
from app.schemas.user import MessageResponse
from app.services.employee_service import EmployeeService

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.post(
    "/",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new employee (Manager/Admin)",
)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = EmployeeService(db)
    return await service.create_employee(data)


@router.get(
    "/",
    response_model=EmployeeListResponse,
    summary="List all employees",
)
async def list_employees(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    department: Optional[str] = Query(default=None),
    active_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EmployeeService(db)
    employees, total = await service.get_all_employees(
        page, per_page, search, department, active_only
    )
    return EmployeeListResponse(
        employees=employees, total=total, page=page, per_page=per_page
    )


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get employee details",
)
async def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EmployeeService(db)
    return await service.get_employee(employee_id)


@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update employee info (Manager/Admin)",
)
async def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = EmployeeService(db)
    return await service.update_employee(employee_id, data)


@router.delete(
    "/{employee_id}",
    response_model=MessageResponse,
    summary="Remove an employee (Manager/Admin)",
)
async def delete_employee(
    employee_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    service = EmployeeService(db)
    return await service.delete_employee(employee_id)
