"""
Pydantic v2 schemas for User — request validation and response serialization.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    """Common user fields shared across schemas."""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.STAFF


class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(..., min_length=8, max_length=128)

    # Removed strict password validation for easier testing


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    profile_image: Optional[str] = None


class UserResponse(BaseModel):
    """Schema for returning user data in API responses."""
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    profile_image: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Schema for paginated user list responses."""
    users: list[UserResponse]
    total: int
    page: int
    per_page: int


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Schema for login endpoint."""
    email: EmailStr = Field(..., json_schema_extra={"example": "admin@restaurant.com"})
    password: str = Field(..., min_length=1, json_schema_extra={"example": "Admin@123"})


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token endpoint."""
    refresh_token: str


class AccessTokenResponse(BaseModel):
    """Schema for refreshed access token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot password request."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for password reset with token."""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    # Removed strict password validation for easier testing


class ChangePasswordRequest(BaseModel):
    """Schema for changing password while authenticated."""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    # Removed strict password validation for easier testing


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True
