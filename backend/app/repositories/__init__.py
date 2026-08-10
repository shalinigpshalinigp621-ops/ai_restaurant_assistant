"""Repositories package."""
from app.repositories.user_repository import UserRepository
from app.repositories.menu_repository import MenuRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.inventory_repository import InventoryRepository
from app.repositories.waste_repository import WasteRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.supplier_repository import SupplierRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.report_repository import ReportRepository
from app.repositories.ai_repository import AIRepository
from app.repositories.setting_repository import SettingRepository

__all__ = ["UserRepository", "MenuRepository", "OrderRepository", "CustomerRepository", "InventoryRepository", "WasteRepository", "EmployeeRepository", "SupplierRepository", "ReviewRepository", "ReportRepository", "AIRepository", "SettingRepository"]
