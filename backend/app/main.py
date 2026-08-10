"""
FastAPI application entry point.
Configures middleware, CORS, rate limiting, routers, and startup events.
"""

import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.database import create_tables
from app.api import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Rate limiter (per IP)
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"📊 Environment: {settings.ENVIRONMENT}")
    try:
        await create_tables()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise

    yield

    # Shutdown
    logger.info("🛑 Shutting down application...")


# Create FastAPI app
app = FastAPI(
    title=f"{settings.APP_NAME} API",
    description="""
## Intelligent Restaurant Analytics and Knowledge Assistant API

A production-ready AI-powered restaurant management platform.

### Features
- 🔐 JWT Authentication with Role-Based Access Control
- 📊 Real-time Analytics and Business Intelligence  
- 🤖 AI Knowledge Assistant powered by Google Gemini
- 📦 Inventory Management with Low Stock Alerts
- 🍽️ Order & Menu Management
- 👥 Customer Segmentation & Analytics
- 🗑️ Food Waste Tracking & Sustainability Reports
- 📈 Machine Learning Forecasting

### Authentication
All protected endpoints require a Bearer JWT token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```
    """,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ─── Middleware ────────────────────────────────────────────────────────────────

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add X-Process-Time header to all responses."""
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    return response


# ─── Exception Handlers ───────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for Pydantic validation errors."""
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({"field": field, "message": error["msg"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "errors": errors,
        },
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"success": False, "message": "Resource not found"},
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(api_router)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint — confirms server is running."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs": "/api/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for deployment monitoring."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
