"""
User SQLAlchemy ORM model.
Defines the users table with roles, timestamps, and relationship fields.
"""

from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    """Role-based access control levels."""
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"


class User(Base):
    """
    Users table — stores restaurant staff accounts.
    Supports role-based access: admin, manager, staff.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        Enum(UserRole),
        default=UserRole.STAFF,
        nullable=False,
        index=True,
    )
    phone = Column(String(20), nullable=True)
    profile_image = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Password reset fields
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    last_login = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
