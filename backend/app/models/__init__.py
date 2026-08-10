"""
Models package — exports all ORM models for easy import.
"""

from app.models.user import User, UserRole
from app.models.restaurant import Restaurant
from app.models.all_models import (
    Customer, Order, OrderItem, OrderStatus, PaymentStatus,
    Menu, FoodCategory, Inventory, Employee, Supplier,
    FoodWaste,
)
from app.models.setting import Setting

__all__ = [
    "User", "UserRole",
    "Restaurant",
    "Customer",
    "Order", "OrderItem", "OrderStatus", "PaymentStatus",
    "Menu", "FoodCategory",
    "Inventory",
    "Employee",
    "Supplier",
    "Review",
    "Payment",
    "Report",
    "AILog",
    "FoodWaste",
    "Setting",
]
