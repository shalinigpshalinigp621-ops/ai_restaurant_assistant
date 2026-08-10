from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.setting import Setting

class SettingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> dict:
        result = await self.db.execute(select(Setting))
        settings = result.scalars().all()
        return {s.key: s.value for s in settings}

    async def upsert(self, key: str, value: Any):
        result = await self.db.execute(select(Setting).where(Setting.key == key))
        setting = result.scalar_one_or_none()
        
        if setting:
            setting.value = value
        else:
            setting = Setting(key=key, value=value)
            self.db.add(setting)
            
        await self.db.commit()
        await self.db.refresh(setting)
        return setting

    async def bulk_upsert(self, settings: dict):
        for key, value in settings.items():
            result = await self.db.execute(select(Setting).where(Setting.key == key))
            setting = result.scalar_one_or_none()
            if setting:
                setting.value = value
            else:
                setting = Setting(key=key, value=value)
                self.db.add(setting)
        await self.db.commit()
