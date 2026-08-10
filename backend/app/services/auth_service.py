"""
Authentication service — business logic for user registration, login,
token refresh, and password management.
Sits between API routes and the repository layer.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.repositories.user_repository import UserRepository
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.schemas.user import (
    UserCreate, TokenResponse, UserResponse,
    LoginRequest, ChangePasswordRequest,
)
import logging

logger = logging.getLogger(__name__)


class AuthService:
    """
    Authentication business logic service.
    Handles registration, login, token management, and password operations.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def register(self, user_data: UserCreate) -> UserResponse:
        """
        Register a new user.
        
        Args:
            user_data: Validated user creation data
        
        Returns:
            UserResponse of the created user
        
        Raises:
            HTTPException 409 if email already exists
        """
        # Check duplicate email
        if await self.repo.email_exists(user_data.email.lower()):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists"
            )

        # Create user model instance
        user = User(
            full_name=user_data.full_name,
            email=user_data.email.lower(),
            hashed_password=get_password_hash(user_data.password),
            role=user_data.role,
            phone=user_data.phone,
            is_active=True,
            is_verified=False,
        )

        created_user = await self.repo.create(user)
        logger.info(f"New user registered: {created_user.email} (role={created_user.role})")
        return UserResponse.model_validate(created_user)

    async def login(self, login_data: LoginRequest) -> TokenResponse:
        """
        Authenticate user and return JWT tokens.
        
        Args:
            login_data: Email and password credentials
        
        Returns:
            TokenResponse with access_token, refresh_token, and user data
        
        Raises:
            HTTPException 401 if credentials are invalid
        """
        user = await self.repo.get_by_email(login_data.email.lower())

        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account has been deactivated. Contact your administrator."
            )

        # Create tokens
        access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
        )
        refresh_token = create_refresh_token(subject=user.id)

        # Update last login
        await self.repo.update_last_login(user.id)

        logger.info(f"User logged in: {user.email}")

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )

    async def refresh_access_token(self, refresh_token: str) -> dict:
        """
        Issue a new access token using a valid refresh token.
        
        Returns:
            Dict with new access_token
        
        Raises:
            HTTPException 401 if refresh token is invalid
        """
        payload = decode_token(refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = payload.get("sub")
        user = await self.repo.get_by_id(int(user_id))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )

        new_access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
        )

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def change_password(
        self,
        user: User,
        password_data: ChangePasswordRequest
    ) -> dict:
        """
        Change password for the authenticated user.
        Verifies current password before updating.
        """
        if not verify_password(password_data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        new_hash = get_password_hash(password_data.new_password)
        await self.repo.update(user.id, hashed_password=new_hash)
        logger.info(f"Password changed for user: {user.email}")
        return {"message": "Password changed successfully", "success": True}

    async def forgot_password(self, email: str) -> dict:
        """
        Generate and store a password reset token.
        In production, send via email. Here we return it in the response.
        """
        user = await self.repo.get_by_email(email.lower())

        # Don't reveal whether email exists (security best practice)
        if not user:
            return {
                "message": "If this email exists, a reset link has been sent.",
                "success": True,
            }

        # Generate secure token
        reset_token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)

        await self.repo.update(
            user.id,
            reset_token=reset_token,
            reset_token_expires=expires,
        )

        logger.info(f"Password reset token generated for: {email}")

        # In production: send email with reset link
        # For development: include token in response
        return {
            "message": "Password reset token generated. Check your email.",
            "success": True,
            "reset_token": reset_token,  # Remove in production!
        }

    async def reset_password(self, token: str, new_password: str) -> dict:
        """Reset password using a valid reset token."""
        user = await self.repo.get_by_reset_token(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        new_hash = get_password_hash(new_password)
        await self.repo.update(
            user.id,
            hashed_password=new_hash,
            reset_token=None,
            reset_token_expires=None,
        )

        logger.info(f"Password reset completed for: {user.email}")
        return {"message": "Password reset successfully", "success": True}
