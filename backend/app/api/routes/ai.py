"""
AI Knowledge Assistant API Routes (Proxy to Render ML Service).
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.ai import ChatRequest, ChatResponse, AILogListResponse

router = APIRouter(prefix="/ai", tags=["AI Knowledge Assistant"])

class AddKnowledgeDocRequest(BaseModel):
    id: str = Field(..., description="Unique ID for document")
    text: str = Field(..., min_length=10, description="Content text of document or menu policy")
    category: str = Field("general", description="Category e.g., menu, policy, procedure")

from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.ai_service import AIService
from app.core.vector_db import vector_db, KNOWLEDGE_BASE_DOCS
import logging

logger = logging.getLogger(__name__)

async def _proxy_request(request: Request, method: str, path: str, params: dict = None, json: dict = None):
    if not settings.ML_SERVICE_URL:
        raise HTTPException(status_code=503, detail="ML Service URL is not configured.")
    
    url = f"{settings.ML_SERVICE_URL.rstrip('/')}{path}"
    headers = {"Authorization": request.headers.get("Authorization", "")}
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                json=json,
                headers=headers
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.warning(f"Proxy request to {path} failed: {e}")
        raise e


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    request_obj: ChatRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    RAG Chat endpoint using Gemini AI & ChromaDB context (with local fallback).
    """
    if settings.ML_SERVICE_URL:
        try:
            return await _proxy_request(request, "POST", "/ai/chat", json=request_obj.model_dump())
        except Exception as e:
            logger.info(f"Fallback to local AIService due to proxy exception: {e}")

    service = AIService(db)
    return await service.answer_question(user_id=current_user.id, request=request_obj)


@router.get("/history", response_model=AILogListResponse)
async def get_chat_history(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch paginated chat interaction history for current user (with local fallback).
    """
    if settings.ML_SERVICE_URL:
        try:
            return await _proxy_request(request, "GET", "/ai/history", params={"page": page, "per_page": per_page})
        except Exception:
            pass

    service = AIService(db)
    logs, total = await service.get_chat_history(user_id=current_user.id, page=page, per_page=per_page)
    return AILogListResponse(logs=logs, total=total, page=page, per_page=per_page)


@router.get("/knowledge-base")
async def get_knowledge_base_documents(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve indexed knowledge base documents in ChromaDB vector store (with local fallback).
    """
    if settings.ML_SERVICE_URL:
        try:
            return await _proxy_request(request, "GET", "/ai/knowledge-base")
        except Exception:
            pass

    try:
        vector_db.initialize()
        if vector_db.collection:
            count = vector_db.collection.count()
            results = vector_db.collection.get()
            docs = []
            if results and "documents" in results and results["documents"]:
                for doc_id, doc, meta in zip(results["ids"], results["documents"], results["metadatas"]):
                    docs.append({"id": doc_id, "text": doc, "metadata": meta or {}})
            return {"total": count, "documents": docs}
    except Exception as e:
        logger.error(f"Local ChromaDB query error: {e}")

    return {"total": len(KNOWLEDGE_BASE_DOCS), "documents": KNOWLEDGE_BASE_DOCS}


@router.post("/knowledge-base")
async def add_knowledge_base_document(
    doc: AddKnowledgeDocRequest,
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Add a new knowledge document into ChromaDB vector database (with local fallback).
    """
    if settings.ML_SERVICE_URL:
        try:
            return await _proxy_request(request, "POST", "/ai/knowledge-base", json=doc.model_dump())
        except Exception:
            pass

    try:
        vector_db.initialize()
        metadata = {"category": doc.category, "added_by": current_user.email}
        if vector_db.collection:
            vector_db.collection.add(
                ids=[doc.id],
                documents=[doc.text],
                metadatas=[metadata]
            )
            return {"status": "success", "message": "Document added to vector database", "id": doc.id}
    except Exception as e:
        logger.error(f"Local ChromaDB add error: {e}")

    metadata = {"category": doc.category, "added_by": current_user.email}
    KNOWLEDGE_BASE_DOCS.append({"id": doc.id, "text": doc.text, "metadata": metadata})
    return {"status": "success", "message": "Document added to in-memory vector store fallback", "id": doc.id}

@router.get("/status")
async def get_ai_status(current_user: User = Depends(get_current_user)):
    """
    Diagnostic endpoint to test Gemini AI & ChromaDB configuration securely without exposing keys.
    """
    from app.core.config import settings, get_gemini_api_key
    from app.core.vector_db import vector_db

    api_key = get_gemini_api_key()
    model = settings.GEMINI_MODEL

    # Check ChromaDB status
    chroma_online = False
    try:
        vector_db.initialize()
        chroma_online = vector_db.collection is not None
    except Exception:
        chroma_online = False

    status_report = {
        "api_key_configured": bool(api_key),
        "api_key_detected": bool(api_key),
        "sdk_installed": False,
        "client_initialized": False,
        "chromadb_status": "ONLINE" if chroma_online else "OFFLINE",
        "model_configured": model,
        "test_result": "FAILED",
        "error_category": None,
        "error": None
    }

    if not api_key:
        status_report["error_category"] = "missing_api_key"
        status_report["error"] = "Gemini API Key is not configured. Please set GOOGLE_API_KEY in backend/.env."
        return status_report

    try:
        from google import genai
        status_report["sdk_installed"] = True

        client = genai.Client(api_key=api_key)
        status_report["client_initialized"] = True

        # Lightweight test with Gemini
        response = client.models.generate_content(
            model=model,
            contents="Respond with OK."
        )
        if response and response.text:
            status_report["test_result"] = "SUCCESS"
        else:
            status_report["error_category"] = "empty_response"
            status_report["error"] = "Empty response received from Gemini."

    except ImportError:
        status_report["error_category"] = "sdk_missing"
        status_report["error"] = "google-genai Python SDK is not installed."
    except Exception as e:
        err_msg = str(e)
        status_report["error"] = err_msg
        if "API_KEY_INVALID" in err_msg or "400" in err_msg or "403" in err_msg or "API key not valid" in err_msg:
            status_report["error_category"] = "invalid_api_key"
        elif "404" in err_msg or "not found" in err_msg.lower():
            status_report["error_category"] = "model_not_found"
        elif "429" in err_msg or "quota" in err_msg.lower():
            status_report["error_category"] = "quota_exceeded"
        else:
            status_report["error_category"] = "gemini_error"

    return status_report
