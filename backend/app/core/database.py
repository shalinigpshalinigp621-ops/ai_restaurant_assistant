"""
Async SQLAlchemy database engine, session factory, and base model.
Uses asyncpg driver for async PostgreSQL access.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create async engine with driver auto-detection
engine_kwargs = {"echo": settings.DEBUG}
if "postgresql" in settings.DATABASE_URL:
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)


# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncSession:
    """
    FastAPI dependency that yields an async database session.
    Automatically closes the session after the request is complete.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """
    Create all tables on startup.
    In production, use Alembic migrations instead.
    """
    async with engine.begin() as conn:
        # Import all models to register them with Base
        from app.models import user, restaurant, customer, order, menu
        from app.models import inventory, employee, supplier, review, payment
        from app.models import report, ai_log
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables created successfully")
