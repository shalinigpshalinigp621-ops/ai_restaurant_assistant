"""
FastAPI dependency for extracting and validating the current authenticated user.
Supports role-based access control.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import verify_access_token
from app.repositories.user_repository import UserRepository
from app.models.user import User, UserRole
import logging

logger = logging.getLogger(__name__)

# Bearer token scheme
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer

bearer_scheme = HTTPBearer(auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    oauth2_token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract current user from JWT bearer token.
    Raises 401 if token is missing or invalid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials if credentials else oauth2_token

    if not token:
        raise credentials_exception

    payload = verify_access_token(token)
    if not payload:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exception

    repo = UserRepository(db)
    user = await repo.get_by_id(int(user_id))
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Alias for get_current_user with active check (already done)."""
    return current_user


def require_role(*roles: UserRole):
    """
    Factory for role-based access control dependency.
    
    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(user = Depends(require_role(UserRole.ADMIN))):
            ...
    """
    async def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {[r.value for r in roles]}"
            )
        return current_user
    return role_checker


# Convenience dependencies
require_admin = require_role(UserRole.ADMIN)
require_manager = require_role(UserRole.ADMIN, UserRole.MANAGER)
require_staff = require_role(UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF)
