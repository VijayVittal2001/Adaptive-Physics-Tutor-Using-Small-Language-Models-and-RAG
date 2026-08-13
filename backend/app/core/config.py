from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv
import os


BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


class Settings(BaseModel):
    # ---------------------------------------------------------
    # Application
    # ---------------------------------------------------------
    app_name: str = "Offline Physics RAG Tutor API"
    api_prefix: str = "/api"

    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))

    frontend_url: str = os.getenv(
        "FRONTEND_URL",
        "http://localhost:3000",
    )

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # ---------------------------------------------------------
    # Storage
    # ---------------------------------------------------------
    storage_dir: Path = BASE_DIR / "storage"

    db_path: Path = (
        BASE_DIR
        / "storage"
        / "sqlite"
        / "physics_tutor.db"
    )

    upload_dir: Path = (
        BASE_DIR
        / "storage"
        / "uploads"
    )

    knowledge_pdf_dir: Path = (
        BASE_DIR
        / "storage"
        / "uploads"
        / "knowledge_pdfs"
    )

    question_paper_dir: Path = (
        BASE_DIR
        / "storage"
        / "uploads"
        / "question_papers"
    )

    extracted_text_dir: Path = (
        BASE_DIR
        / "storage"
        / "extracted_text"
    )

    chunks_dir: Path = (
        BASE_DIR
        / "storage"
        / "chunks"
    )

    vector_dir: Path = (
        BASE_DIR
        / "storage"
        / "vector_index"
    )

    video_dir: Path = (
        BASE_DIR
        / "storage"
        / "videos"
    )

    question_media_dir: Path = (
        BASE_DIR
        / "storage"
        / "question_media"
    )

    html_modules_dir: Path = (
        BASE_DIR
        / "storage"
        / "html_modules"
    )

    report_dir: Path = (
        BASE_DIR
        / "storage"
        / "reports"
    )

    email_outbox_dir: Path = (
        BASE_DIR
        / "storage"
        / "email_outbox"
    )

    # ---------------------------------------------------------
    # Authentication
    # ---------------------------------------------------------
    auth_secret: str = os.getenv(
        "AUTH_SECRET",
        "change-this-local-dev-secret",
    )

    access_token_days: int = int(
        os.getenv(
            "ACCESS_TOKEN_DAYS",
            "7",
        )
    )

    require_email_verification: bool = _bool(
        "REQUIRE_EMAIL_VERIFICATION",
        "false",
    )

    admin_email: str = os.getenv(
        "ADMIN_EMAIL",
        "admin@physicsrag.com",
    ).lower()

    admin_password: str = os.getenv(
        "ADMIN_PASSWORD",
        "admin123",
    )

    admin_name: str = os.getenv(
        "ADMIN_NAME",
        "Physics Tutor Administrator",
    )

    # ---------------------------------------------------------
    # SMTP
    # ---------------------------------------------------------
    smtp_host: str = os.getenv(
        "SMTP_HOST",
        "",
    )

    smtp_port: int = int(
        os.getenv(
            "SMTP_PORT",
            "587",
        )
    )

    smtp_user: str = os.getenv(
        "SMTP_USER",
        "",
    )

    smtp_password: str = os.getenv(
        "SMTP_PASSWORD",
        "",
    )

    smtp_from: str = os.getenv(
        "SMTP_FROM",
        os.getenv(
            "SMTP_USER",
            "no-reply@physicsrag.local",
        ),
    )

    smtp_use_tls: bool = _bool(
        "SMTP_USE_TLS",
        "true",
    )

    # ---------------------------------------------------------
    # Google authentication
    # ---------------------------------------------------------
    google_client_id: str = os.getenv(
        "GOOGLE_CLIENT_ID",
        "",
    )

    # ---------------------------------------------------------
    # Ollama / Local SLM
    # ---------------------------------------------------------

    ollama_url: str = os.getenv(
        "OLLAMA_URL",
        "http://localhost:11434",
    )

    ollama_model: str = os.getenv(
        "OLLAMA_MODEL",
        "qwen3:4b",
    )

    ollama_embed_model: str = os.getenv(
        "OLLAMA_EMBED_MODEL",
        "nomic-embed-text",
    )

    use_ollama: bool = _bool(
        "USE_OLLAMA",
        "true",
    )

    # Qwen context window
    ollama_num_ctx: int = int(
        os.getenv(
            "OLLAMA_NUM_CTX",
            "4096",
        )
    )

    # Limit generated answer length.
    # Keeps simple Physics answers faster.
    ollama_num_predict: int = int(
        os.getenv(
            "OLLAMA_NUM_PREDICT",
            "180",
        )
    )

    # Low temperature improves deterministic,
    # textbook-grounded answers.
    ollama_temperature: float = float(
        os.getenv(
            "OLLAMA_TEMPERATURE",
            "0.1",
        )
    )

    # Disable Qwen reasoning/thinking for faster RAG answers.
    ollama_think: bool = _bool(
        "OLLAMA_THINK",
        "false",
    )

    # ---------------------------------------------------------
    # HuggingFace fallback
    # ---------------------------------------------------------
    huggingface_token: str = os.getenv(
        "HUGGINGFACE_TOKEN",
        "",
    )

    huggingface_model: str = os.getenv(
        "HUGGINGFACE_MODEL",
        "Qwen/Qwen2.5-72B-Instruct",
    )

    # ---------------------------------------------------------
    # Embeddings
    # ---------------------------------------------------------

    embedding_provider: str = os.getenv(
        "EMBEDDING_PROVIDER",
        "ollama",
    )

    embedding_model: str = os.getenv(
        "EMBEDDING_MODEL",
        "sentence-transformers/all-MiniLM-L6-v2",
    )

    embedding_batch_size: int = int(
        os.getenv(
            "EMBEDDING_BATCH_SIZE",
            "16",
        )
    )

    # ---------------------------------------------------------
    # RAG SETTINGS
    # ---------------------------------------------------------

    # Smaller chunks are better for textbook definition questions.
    #
    # OLD:
    # chunk_size = 800
    #
    # NEW:
    # chunk_size = 450
    chunk_size: int = int(
        os.getenv(
            "CHUNK_SIZE",
            "450",
        )
    )

    # Smaller overlap reduces duplicate text while
    # preserving nearby context.
    #
    # OLD:
    # 180
    #
    # NEW:
    # 80
    chunk_overlap: int = int(
        os.getenv(
            "CHUNK_OVERLAP",
            "80",
        )
    )

    # Retrieve more candidates from Chroma.
    # We will later rerank them.
    retrieval_top_k: int = int(
        os.getenv(
            "RETRIEVAL_TOP_K",
            "6",
        )
    )

    # Only the best 3 chunks should finally
    # be sent to Qwen.
    final_context_k: int = int(
        os.getenv(
            "FINAL_CONTEXT_K",
            "3",
        )
    )

    # ---------------------------------------------------------
    # Upload Limits
    # ---------------------------------------------------------
    max_upload_mb: int = int(
        os.getenv(
            "MAX_UPLOAD_MB",
            "80",
        )
    )

    max_video_upload_mb: int = int(
        os.getenv(
            "MAX_VIDEO_UPLOAD_MB",
            "400",
        )
    )


settings = Settings()


# -------------------------------------------------------------
# Automatically create required storage folders
# -------------------------------------------------------------
for path in [
    settings.storage_dir,
    settings.knowledge_pdf_dir,
    settings.question_paper_dir,
    settings.extracted_text_dir,
    settings.chunks_dir,
    settings.vector_dir,
    settings.video_dir,
    settings.video_dir / "scripts",
    settings.video_dir / "topic_videos",
    settings.question_media_dir / "images",
    settings.question_media_dir / "solution_videos",
    settings.html_modules_dir,
    settings.report_dir,
    settings.email_outbox_dir,
    settings.db_path.parent,
]:
    path.mkdir(
        parents=True,
        exist_ok=True,
    )