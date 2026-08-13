from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.services.rag_service import ask_rag
from app.services.vector_service import (
    index_status,
    rebuild_index,
    reset_index,
)


router = APIRouter(
    prefix="/rag",
    tags=["rag"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class AskIn(BaseModel):
    question: str | None = None
    query: str | None = None

    student_id: str | None = None

    chapter_id: str | None = None
    topic_id: str | None = None

    # If frontend does not send top_k,
    # backend uses config value.
    top_k: int | None = None


# ============================================================
# STUDENT RAG QUESTION
# ============================================================

@router.post("/ask")
def ask(data: AskIn):
    """
    Main student RAG endpoint.

    Flow:
    request
        -> rag_service
        -> vector retrieval
        -> reranking
        -> best chunks
        -> Qwen
        -> response
    """

    question = (
        data.question
        or data.query
        or ""
    ).strip()

    # Use configured retrieval value unless
    # frontend explicitly overrides it.
    top_k = (
        data.top_k
        if data.top_k is not None
        else settings.retrieval_top_k
    )

    return ask_rag(
        question=question,
        student_id=data.student_id,
        chapter_id=data.chapter_id,
        topic_id=data.topic_id,
        top_k=top_k,
    )


# ============================================================
# VECTOR INDEX STATUS
# ============================================================

@router.get("/index/status")
def vector_index_status():
    """
    Check current Chroma index information.
    """

    return index_status()


# ============================================================
# REBUILD VECTOR INDEX
# ============================================================

@router.post("/index/rebuild")
def rebuild_vector_index():
    """
    Rebuild Chroma using all current SQLite RAG chunks.

    Use after changing:
    - embeddings
    - metadata
    - vector indexing logic

    For new chunk-size changes, PDF should first be reprocessed
    so SQLite rag_chunks also contains the new chunks.
    """

    return rebuild_index()


# ============================================================
# RESET VECTOR INDEX
# ============================================================

@router.post("/index/reset")
def reset_vector_index():
    """
    Delete the local Chroma vector index.

    This does NOT delete uploaded PDFs or SQLite RAG chunks.
    """

    return reset_index()