"""
AI Knowledge Assistant API Routes — RAG chat, vector database documents, and interaction logs.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.vector_db import vector_db, KNOWLEDGE_BASE_DOCS
from app.models.user import User
from app.services.ai_service import AIService
from app.schemas.ai import ChatRequest, ChatResponse, AILogListResponse

router = APIRouter(prefix="/ai", tags=["AI Knowledge Assistant"])


class AddKnowledgeDocRequest(BaseModel):
    id: str = Field(..., description="Unique ID for document")
    text: str = Field(..., min_length=10, description="Content text of document or menu policy")
    category: str = Field("general", description="Category e.g., menu, policy, procedure")


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    RAG Chat endpoint using Gemini AI & ChromaDB context.
    """
    service = AIService(db)
    return await service.answer_question(user_id=current_user.id, request=request)


@router.get("/history", response_model=AILogListResponse)
async def get_chat_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch paginated chat interaction history for current user.
    """
    service = AIService(db)
    logs, total = await service.get_chat_history(user_id=current_user.id, page=page, per_page=per_page)
    return AILogListResponse(logs=logs, total=total, page=page, per_page=per_page)


@router.get("/knowledge-base")
async def get_knowledge_base_documents(
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve indexed knowledge base documents in ChromaDB vector store.
    """
    vector_db.initialize()
    if vector_db.collection:
        try:
            count = vector_db.collection.count()
            results = vector_db.collection.get()
            docs = []
            if results and "documents" in results and results["documents"]:
                for doc_id, doc, meta in zip(results["ids"], results["documents"], results["metadatas"]):
                    docs.append({"id": doc_id, "text": doc, "metadata": meta or {}})
            return {"total": count, "documents": docs}
        except Exception as e:
            pass

    return {"total": len(KNOWLEDGE_BASE_DOCS), "documents": KNOWLEDGE_BASE_DOCS}


@router.post("/knowledge-base")
async def add_knowledge_base_document(
    doc: AddKnowledgeDocRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Add a new knowledge document/policy/menu specification into the ChromaDB vector database.
    """
    vector_db.initialize()
    metadata = {"category": doc.category, "added_by": current_user.email}
    
    if vector_db.collection:
        try:
            vector_db.collection.add(
                ids=[doc.id],
                documents=[doc.text],
                metadatas=[metadata]
            )
            return {"status": "success", "message": "Document added to vector database", "id": doc.id}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to add document to vector store: {e}")

    # Fallback in-memory add
    KNOWLEDGE_BASE_DOCS.append({"id": doc.id, "text": doc.text, "metadata": metadata})
    return {"status": "success", "message": "Document added to in-memory vector store fallback", "id": doc.id}
