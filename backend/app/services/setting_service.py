from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.setting_repository import SettingRepository
from app.schemas.setting import SettingsUpdate

class SettingService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = SettingRepository(db)
        self.defaults = {
            "restaurant_name": "Intelligent Gourmet Bistro",
            "currency": "INR (₹)",
            "tax_rate": "5.0",
            "gemini_model": "gemini-2.5-flash",
            "enable_notifications": True,
            "auto_reorder": False
        }

    async def get_settings(self) -> dict:
        stored_settings = await self.repository.get_all()
        result = self.defaults.copy()
        result.update(stored_settings)
        return result

    async def update_settings(self, data: SettingsUpdate) -> dict:
        update_data = data.model_dump(exclude_unset=True)
        non_none_data = {k: v for k, v in update_data.items() if v is not None}
        
        if non_none_data:
            await self.repository.bulk_upsert(non_none_data)
            
        return await self.get_settings()
