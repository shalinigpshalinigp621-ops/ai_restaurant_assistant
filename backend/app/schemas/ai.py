"""
AI Knowledge Assistant Schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or assistant")
    content: str = Field(..., description="Message text")


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="User query or prompt")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Previous conversation messages")


class ChatResponse(BaseModel):
    answer: str
    context_used: Optional[List[str]] = Field(default=[])
    sources: Optional[List[Dict[str, Any]]] = Field(default=[])
    model_used: str = "gemini-2.5-flash"
    response_time_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AILogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    question: str
    answer: Optional[str] = None
    context_retrieved: Optional[Any] = None
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None
    response_time_ms: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AILogListResponse(BaseModel):
    logs: List[AILogResponse]
    total: int
    page: int
    per_page: int
