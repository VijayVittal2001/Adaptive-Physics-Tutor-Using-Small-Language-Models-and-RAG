from fastapi import FastAPI
# Trigger uvicorn hot reload after fixing chromadb dependencies

from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.db import init_db
from app.routers import auth_routes, dashboard_routes, evaluation_routes, pdf_routes, question_routes, rag_routes, video_routes, html_routes, diagram_routes

init_db()

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):(3000|3001|5173|8000)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Offline Physics RAG Tutor API is running", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok", "offline": True, "model": settings.ollama_model, "ollama_enabled": settings.use_ollama, "embedding_provider": settings.embedding_provider, "embedding_model": settings.ollama_embed_model if settings.embedding_provider.lower() == "ollama" else settings.embedding_model, "top_k": settings.retrieval_top_k, "chunk_size": settings.chunk_size, "chunk_overlap": settings.chunk_overlap}

app.include_router(auth_routes.router, prefix=settings.api_prefix)
app.include_router(pdf_routes.router, prefix=settings.api_prefix)
app.include_router(rag_routes.router, prefix=settings.api_prefix)
app.include_router(question_routes.router, prefix=settings.api_prefix)
app.include_router(evaluation_routes.router, prefix=settings.api_prefix)
app.include_router(video_routes.router, prefix=settings.api_prefix)
app.include_router(video_routes.legacy_router, prefix=settings.api_prefix)
app.include_router(dashboard_routes.router, prefix=settings.api_prefix)
app.include_router(html_routes.router, prefix=settings.api_prefix)
app.include_router(diagram_routes.router, prefix=settings.api_prefix)
