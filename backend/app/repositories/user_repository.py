"""
User repository — encapsulates all database operations for the User model.
Follows the Repository Pattern for clean data access abstraction.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.models.user import User, UserRole
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class UserRepository:
    """
    Data access layer for User operations.
    All methods are async and use SQLAlchemy 2.0 style queries.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user: User) -> User:
        """Persist a new User record."""
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        logger.info(f"Created user: {user.email}")
        return user

    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Retrieve a user by primary key."""
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_active == True)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Retrieve a user by email address (case-insensitive)."""
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        page: int = 1,
        per_page: int = 20,
        role: Optional[UserRole] = None,
    ) -> tuple[List[User], int]:
        """
        Retrieve paginated list of users with optional role filter.
        Returns (users, total_count).
        """
        query = select(User)
        count_query = select(func.count(User.id))

        if role:
            query = query.where(User.role == role)
            count_query = count_query.where(User.role == role)

        # Total count
        count_result = await self.db.execute(count_query)
        total = count_result.scalar_one()

        # Paginated results
        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page).order_by(User.created_at.desc())
        result = await self.db.execute(query)
        users = result.scalars().all()

        return list(users), total

    async def update(self, user_id: int, **kwargs) -> Optional[User]:
        """Update specified fields on a user record."""
        await self.db.execute(
            update(User).where(User.id == user_id).values(**kwargs)
        )
        await self.db.flush()
        return await self.get_by_id(user_id)

    async def update_last_login(self, user_id: int) -> None:
        """Update the last_login timestamp for a user."""
        from datetime import datetime, timezone
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(last_login=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def email_exists(self, email: str) -> bool:
        """Check if an email already exists in the database."""
        result = await self.db.execute(
            select(func.count(User.id)).where(User.email == email.lower())
        )
        return result.scalar_one() > 0

    async def deactivate(self, user_id: int) -> bool:
        """Soft-delete a user by setting is_active=False."""
        result = await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(is_active=False)
        )
        await self.db.flush()
        return result.rowcount > 0

    async def get_by_reset_token(self, token: str) -> Optional[User]:
        """Retrieve user by password reset token."""
        from datetime import datetime, timezone
        result = await self.db.execute(
            select(User).where(
                User.reset_token == token,
                User.reset_token_expires > datetime.now(timezone.utc)
            )
        )
        return result.scalar_one_or_none()

    async def count_by_role(self) -> dict:
        """Count users grouped by role."""
        result = await self.db.execute(
            select(User.role, func.count(User.id))
            .where(User.is_active == True)
            .group_by(User.role)
        )
        return {row[0]: row[1] for row in result.all()}
