"""
Core configuration settings using pydantic-settings.
Reads from environment variables and .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List
from dotenv import load_dotenv
import os

# Explicitly load backend/.env if it exists regardless of execution CWD
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env_path = os.path.join(backend_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "RestaurantAI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # Google Gemini AI
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "text-embedding-004"

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_PERSIST_DIR: str = "./chroma_data"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Environment
    ENVIRONMENT: str = "development"
    
    # Microservice URL for heavy ML/RAG processing
    ML_SERVICE_URL: str = ""

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton settings instance
settings = Settings()


def get_gemini_api_key() -> str:
    """
    Safely retrieve Gemini API Key checking GOOGLE_API_KEY, GEMINI_API_KEY, and GOOGLE_GEMINI_API_KEY.
    Returns empty string if unconfigured or default placeholder.
    """
    key = (
        os.getenv("GOOGLE_API_KEY") or
        os.getenv("GEMINI_API_KEY") or
        os.getenv("GOOGLE_GEMINI_API_KEY") or
        getattr(settings, "GOOGLE_API_KEY", "") or
        ""
    ).strip()

    if key and key != "your-google-gemini-api-key-here":
        return key
    return ""

