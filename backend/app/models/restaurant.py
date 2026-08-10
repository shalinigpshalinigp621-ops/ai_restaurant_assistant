"""
Restaurant SQLAlchemy model — Module 3.
Placeholder to prevent import errors. Full implementation in Module 3.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class Restaurant(Base):
    """Restaurant table — stores restaurant profile and settings."""
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    cuisine_type = Column(String(100), nullable=True)
    opening_hours = Column(String(200), nullable=True)
    rating = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Restaurant id={self.id} name={self.name}>"
