"""
API routes package — collects all routers for registration in main.py.
"""

from fastapi import APIRouter
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.menu import router as menu_router
from app.api.routes.orders import router as orders_router
from app.api.routes.customers import router as customers_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.waste import router as waste_router
from app.api.routes.employees import router as employees_router
from app.api.routes.suppliers import router as suppliers_router
from app.api.routes.reviews import router as reviews_router
from app.api.routes.reports import router as reports_router
from app.api.routes.ai import router as ai_router
from app.api.routes.ml import router as ml_router
from app.api.routes.settings import router as settings_router

# Main API router with /api/v1 prefix
api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(dashboard_router)
api_router.include_router(menu_router)
api_router.include_router(orders_router)
api_router.include_router(customers_router)
api_router.include_router(inventory_router)
api_router.include_router(waste_router)
api_router.include_router(employees_router)
api_router.include_router(suppliers_router)
api_router.include_router(reviews_router)
api_router.include_router(reports_router)
api_router.include_router(ai_router)
api_router.include_router(ml_router)
api_router.include_router(settings_router)

__all__ = ["api_router"]

