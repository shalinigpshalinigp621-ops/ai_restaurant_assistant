from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import require_admin
from app.schemas.setting import SettingsResponse, SettingsUpdate
from app.services.setting_service import SettingService

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("/", response_model=SettingsResponse)
async def get_settings(current_user = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    service = SettingService(db)
    return await service.get_settings()

@router.put("/", response_model=SettingsResponse)
async def update_settings(data: SettingsUpdate, current_user = Depends(require_admin), db: AsyncSession = Depends(get_db)):
    service = SettingService(db)
    return await service.update_settings(data)
