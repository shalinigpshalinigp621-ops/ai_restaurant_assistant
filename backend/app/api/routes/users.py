"""
User management API routes.
Admin/Manager only: list, get, update, deactivate users.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, require_manager
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse, UserUpdate, UserListResponse, MessageResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get(
    "/",
    response_model=UserListResponse,
    summary="List all users (Admin/Manager only)",
)
async def list_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    role: Optional[UserRole] = Query(default=None),
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve paginated list of all users.
    Optionally filter by role.
    Requires Manager or Admin role.
    """
    repo = UserRepository(db)
    users, total = await repo.get_all(page=page, per_page=per_page, role=role)
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get a specific user by ID",
)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_manager),
    db: AsyncSession = Depends(get_db),
):
    """Get a single user by their ID. Requires Manager or Admin role."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id={user_id} not found"
        )
    return UserResponse.model_validate(user)


@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update own profile",
)
async def update_own_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's own profile fields."""
    repo = UserRepository(db)
    update_fields = update_data.model_dump(exclude_none=True)
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update"
        )
    updated = await repo.update(current_user.id, **update_fields)
    return UserResponse.model_validate(updated)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user (Admin only)",
)
async def update_user(
    user_id: int,
    update_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update any user's profile. Admin only."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id={user_id} not found"
        )
    update_fields = update_data.model_dump(exclude_none=True)
    updated = await repo.update(user_id, **update_fields)
    return UserResponse.model_validate(updated)


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    summary="Deactivate a user (Admin only)",
)
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a user by deactivating their account. Admin only."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )
    repo = UserRepository(db)
    success = await repo.deactivate(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id={user_id} not found"
        )
    return {"message": f"User {user_id} deactivated successfully", "success": True}


@router.get(
    "/stats/by-role",
    summary="Get user count by role (Admin only)",
)
async def user_stats_by_role(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get a breakdown of users by role."""
    repo = UserRepository(db)
    counts = await repo.count_by_role()
    return {"role_counts": {k.value: v for k, v in counts.items()}}
