"""
Authentication API routes.
Handles registration, login, token refresh, and password management.
"""

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.auth_service import AuthService
from app.schemas.user import (
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    AccessTokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    MessageResponse,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="OAuth2 form login for Swagger UI Authorize button",
    include_in_schema=False,
)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    OAuth2 compatible token login for Swagger UI Authorize dialog.
    Accepts form-data (username & password).
    """
    service = AuthService(db)
    return await service.login(LoginRequest(email=form_data.username, password=form_data.password))


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new restaurant staff user.
    
    - **full_name**: User's full name (2-100 chars)
    - **email**: Valid email address
    - **password**: Min 8 chars with at least 1 uppercase and 1 digit
    - **role**: admin | manager | staff (default: staff)
    """
    service = AuthService(db)
    return await service.register(user_data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with email and password.
    Returns JWT access token and refresh token.
    Pre-filled with working dev credentials: admin@restaurant.com / Admin@123
    """
    service = AuthService(db)
    return await service.login(login_data)


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Refresh access token",
)
async def refresh_token(
    token_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a new access token using a valid refresh token.
    Call this when the access token expires.
    """
    service = AuthService(db)
    return await service.refresh_access_token(token_data.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """
    Returns the profile of the currently authenticated user.
    Requires Bearer token in Authorization header.
    """
    return UserResponse.model_validate(current_user)


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password",
)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change the current user's password.
    Requires the current password for verification.
    """
    service = AuthService(db)
    return await service.change_password(current_user, password_data)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset",
)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Request a password reset link.
    In development mode, the reset token is returned in the response.
    In production, it would be sent via email.
    """
    service = AuthService(db)
    return await service.forgot_password(request.email)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password with token",
)
async def reset_password(
    reset_data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Reset password using a valid reset token.
    Token expires in 1 hour.
    """
    service = AuthService(db)
    return await service.reset_password(reset_data.token, reset_data.new_password)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout (client-side token invalidation)",
)
async def logout(
    current_user: User = Depends(get_current_user),
):
    """
    Logout the current user.
    Since JWT is stateless, the client must discard its tokens.
    In a production system, implement a token blacklist with Redis.
    """
    logger.info(f"User logged out: {current_user.email}")
    return {"message": "Logged out successfully", "success": True}
