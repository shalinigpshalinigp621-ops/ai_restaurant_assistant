"""Services package."""
from app.services.auth_service import AuthService
from app.services.dashboard_service import DashboardService
from app.services.menu_service import MenuService
from app.services.order_service import OrderService
from app.services.customer_service import CustomerService
from app.services.inventory_service import InventoryService
from app.services.waste_service import WasteService
from app.services.employee_service import EmployeeService
from app.services.supplier_service import SupplierService
from app.services.review_service import ReviewService
from app.services.report_service import ReportService
from app.services.ai_service import AIService
from app.services.setting_service import SettingService

__all__ = ["AuthService", "DashboardService", "MenuService", "OrderService", "CustomerService", "InventoryService", "WasteService", "EmployeeService", "SupplierService", "ReviewService", "ReportService", "AIService", "SettingService"]
