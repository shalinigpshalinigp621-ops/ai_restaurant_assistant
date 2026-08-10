from pydantic import BaseModel, ConfigDict
from typing import Optional

class SettingsUpdate(BaseModel):
    restaurant_name: Optional[str] = None
    currency: Optional[str] = None
    tax_rate: Optional[str] = None
    gemini_model: Optional[str] = None
    enable_notifications: Optional[bool] = None
    auto_reorder: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)

class SettingsResponse(BaseModel):
    restaurant_name: str = 'Intelligent Gourmet Bistro'
    currency: str = 'INR (₹)'
    tax_rate: str = '5.0'
    gemini_model: str = 'gemini-2.5-flash'
    enable_notifications: bool = True
    auto_reorder: bool = False
    
    model_config = ConfigDict(from_attributes=True)
