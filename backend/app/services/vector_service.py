"""
ChromaDB + Ollama RAG vector store.

Pipeline:

PDF
    -> cleaned chunks
    -> nomic-embed-text
    -> ChromaDB

Student question
    -> query embedding
    -> Chroma candidate retrieval
    -> lexical + semantic reranking
    -> duplicate removal
    -> best chunks
    -> Qwen answer
"""

import json
import re
import shutil
import urllib.request
from typing import Any

from app.core.config import settings
from app.database.db import get_conn
from app.utils.text_utils import (
    overlap_score,
    tokenize,
)


try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings

except Exception:  # pragma: no cover
    chromadb = None
    ChromaSettings = None


COLLECTION_NAME = "physics_rag_knowledge"


# ============================================================
# TEXT CLEANING
# ============================================================

def _clean_for_embedding(text: str) -> str:
    """
    Remove PDF/app metadata noise before creating embeddings.
    """

    text = text or ""

    bad_patterns = [
        r"Reprint\s+\d{4}\s*-\s*\d{2}",
        r"^\s*Physics\s+\d+\s*$",
        r"^\s*Page\s+\d+\s*[:\-]?.*$",
        r"^\s*Chapter\s*=.*$",
        r"^\s*Topic\s*=.*$",
        r"^\s*Subtopic\s*=.*$",
    ]

    for pattern in bad_patterns:
        text = re.sub(
            pattern,
            " ",
            text,
            flags=re.I | re.M,
        )

    # Remove repeated whitespace
    text = re.sub(
        r"\s+",
        " ",
        text,
    ).strip()

    return text


# ============================================================
# DATABASE ROWS FOR FULL INDEX
# ============================================================

def _rows_for_index() -> list[dict[str, Any]]:
    """
    Read processed PDF chunks and admin question-bank content.
    """

    with get_conn() as conn:

        pdf_rows = conn.execute(
            """
            SELECT
                id,
                upload_id,
                upload_name,
                chapter_id,
                chapter,
                topic_id,
                topic,
                subtopic_id,
                subtopic,
                page_number,
                chunk_text,
                'pdf' AS source_kind

            FROM rag_chunks

            ORDER BY
                created_at,
                chunk_index
            """
        ).fetchall()

        q_rows = conn.execute(
            """
            SELECT
                id,
                chapter_id,
                topic_id,
                subtopic_id,
                mapped_topic AS topic,
                marks,
                question_type,
                text,
                model_answer,
                rubric_text,
                keywords_text,
                explanation,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_option,
                image_path,
                solution_video_path,
                'question' AS source_kind

            FROM questions

            WHERE
                TRIM(
                    COALESCE(text, '')
                ) <> ''

            ORDER BY
                created_at
            """
        ).fetchall()

    rows: list[dict[str, Any]] = []

    # --------------------------------------------------------
    # PDF chunks
    # --------------------------------------------------------

    for row in pdf_rows:

        item = dict(row)

        item["chunk_text"] = _clean_for_embedding(
            item.get("chunk_text") or ""
        )

        if item["chunk_text"]:
            rows.append(item)

    # --------------------------------------------------------
    # Question bank
    # --------------------------------------------------------

    for row in q_rows:

        question = dict(row)

        question_type = (
            question.get("question_type")
            or ""
        ).lower()

        if question_type == "mcq":

            content = (
                f"Question: "
                f"{question.get('text') or ''}\n"

                f"Options: "
                f"A) {question.get('option_a') or ''} "
                f"B) {question.get('option_b') or ''} "
                f"C) {question.get('option_c') or ''} "
                f"D) {question.get('option_d') or ''}\n"

                f"Correct option: "
                f"{question.get('correct_option') or ''}\n"

                f"Answer: "
                f"{question.get('model_answer') or ''}\n"

                f"Explanation: "
                f"{question.get('explanation') or ''}"
            )

        else:

            content = (
                f"Question: "
                f"{question.get('text') or ''}\n"

                f"Model answer: "
                f"{question.get('model_answer') or ''}\n"

                f"Rubric: "
                f"{question.get('rubric_text') or ''}\n"

                f"Keywords: "
                f"{question.get('keywords_text') or ''}"
            )

        item = {
            "id": question["id"],

            "upload_id":
                "question-bank",

            "upload_name":
                "Admin Question Bank",

            "chapter_id":
                question.get("chapter_id")
                or "question-bank",

            "chapter":
                question.get("chapter_id")
                or "Question Bank",

            "topic_id":
                question.get("topic_id")
                or "question-bank-topic",

            "topic":
                question.get("topic")
                or question.get("topic_id")
                or "Uploaded Question",

            "subtopic_id":
                question.get("subtopic_id")
                or "question-answer",

            "subtopic":
                question.get("subtopic_id")
                or "Question Answer",

            "page_number": 0,

            "chunk_text":
                _clean_for_embedding(
                    content
                ),

            "source_kind":
                "question",

            "image_path":
                question.get(
                    "image_path"
                ),

            "solution_video_path":
                question.get(
                    "solution_video_path"
                ),
        }

        if item["chunk_text"]:
            rows.append(item)

    return rows


# ============================================================
# DOCUMENT USED FOR EMBEDDING
# ============================================================

def _doc_text(
    row: dict[str, Any],
) -> str:
    """
    Add chapter/topic context to the chunk before embedding.

    This improves retrieval because the vector contains both
    textbook content and its topic metadata.
    """

    chapter = (
        row.get("chapter")
        or ""
    )

    topic = (
        row.get("topic")
        or ""
    )

    subtopic = (
        row.get("subtopic")
        or ""
    )

    content = (
        row.get("chunk_text")
        or ""
    )

    text = (
        f"Chapter: {chapter}\n"
        f"Topic: {topic}\n"
        f"Subtopic: {subtopic}\n"
        f"Content: {content}"
    )

    return _clean_for_embedding(
        text
    )


# ============================================================
# OLLAMA EMBEDDING
# ============================================================

def _ollama_embedding(
    text: str,
) -> list[float] | None:
    """
    Generate one nomic-embed-text embedding using Ollama.
    """

    cleaned = _clean_for_embedding(
        text
    )

    if not cleaned:
        return None

    payload = {
        "model":
            settings.ollama_embed_model,

        "prompt":
            cleaned[:7000],
    }

    request = urllib.request.Request(
        (
            f"{settings.ollama_url.rstrip('/')}"
            "/api/embeddings"
        ),
        data=json.dumps(
            payload
        ).encode("utf-8"),
        headers={
            "Content-Type":
                "application/json"
        },
        method="POST",
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=60,
        ) as response:

            data = json.loads(
                response
                .read()
                .decode("utf-8")
            )

            embedding = (
                data.get("embedding")
                or []
            )

            if (
                isinstance(
                    embedding,
                    list,
                )
                and embedding
            ):
                return embedding

    except Exception as exc:

        print(
            "Ollama embedding error:",
            exc,
        )

    return None


# ============================================================
# CHROMA CLIENT
# ============================================================

def _chroma_client():

    if chromadb is None:
        return None

    settings.vector_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    return chromadb.PersistentClient(
        path=str(
            settings.vector_dir
            / "chroma_db"
        ),
        settings=(
            ChromaSettings(
                anonymized_telemetry=False
            )
            if ChromaSettings
            else None
        ),
    )


def _collection(
    create: bool = True,
):

    client = _chroma_client()

    if client is None:
        return None

    try:

        if create:

            return (
                client
                .get_or_create_collection(
                    name=COLLECTION_NAME,
                    metadata={
                        "hnsw:space":
                            "cosine"
                    },
                )
            )

        return client.get_collection(
            name=COLLECTION_NAME
        )

    except Exception as exc:

        print(
            "Chroma collection error:",
            exc,
        )

        return None


# ============================================================
# METADATA
# ============================================================

def _metadata_from_row(
    row: dict,
    source_kind: str = "pdf",
) -> dict:

    return {
        "id":
            str(
                row.get("id")
                or ""
            ),

        "source_kind":
            str(
                row.get(
                    "source_kind"
                )
                or source_kind
            ),

        "upload_id":
            str(
                row.get(
                    "upload_id"
                )
                or ""
            ),

        "upload_name":
            str(
                row.get(
                    "upload_name"
                )
                or ""
            ),

        "chapter_id":
            str(
                row.get(
                    "chapter_id"
                )
                or ""
            ),

        "chapter":
            str(
                row.get(
                    "chapter"
                )
                or ""
            ),

        "topic_id":
            str(
                row.get(
                    "topic_id"
                )
                or ""
            ),

        "topic":
            str(
                row.get(
                    "topic"
                )
                or ""
            ),

        "subtopic_id":
            str(
                row.get(
                    "subtopic_id"
                )
                or ""
            ),

        "subtopic":
            str(
                row.get(
                    "subtopic"
                )
                or ""
            ),

        "page_number":
            int(
                row.get(
                    "page_number"
                )
                or 0
            ),

        "image_path":
            str(
                row.get(
                    "image_path"
                )
                or ""
            ),

        "solution_video_path":
            str(
                row.get(
                    "solution_video_path"
                )
                or ""
            ),
    }


# ============================================================
# FULL INDEX REBUILD
# ============================================================

def rebuild_index() -> dict:

    rows = _rows_for_index()

    client = _chroma_client()

    if client is None:

        return {
            "ok": False,
            "provider": "chromadb",
            "message":
                "chromadb not installed. "
                "Run pip install -r requirements.txt",
            "chunks": 0,
        }

    try:

        collection = (
            client
            .get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={
                    "hnsw:space":
                        "cosine"
                },
            )
        )

        # Clear existing collection content
        if collection.count() > 0:

            existing = collection.get(
                include=[]
            )

            ids = (
                existing.get("ids")
                if existing
                else []
            )

            if ids:
                collection.delete(
                    ids=ids
                )

    except Exception as exc:

        print(
            "ChromaDB clear index warning:",
            exc,
        )

        try:
            client.delete_collection(
                COLLECTION_NAME
            )
        except Exception:
            pass

        collection = (
            client
            .get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={
                    "hnsw:space":
                        "cosine"
                },
            )
        )

    if not rows:

        return {
            "ok": True,
            "provider": "chromadb",
            "model":
                settings.ollama_embed_model,
            "message":
                "empty index",
            "chunks": 0,
        }

    ids = []
    docs = []
    metas = []
    embeddings = []

    for row in rows:

        text = _doc_text(
            row
        )

        embedding = (
            _ollama_embedding(
                text
            )
        )

        if not embedding:

            return {
                "ok": False,
                "provider": "chromadb",
                "message":
                    "Ollama embedding failed. "
                    f"Run: ollama pull "
                    f"{settings.ollama_embed_model}",
                "chunks": 0,
            }

        ids.append(
            str(
                row["id"]
            )
        )

        docs.append(
            text
        )

        metas.append(
            _metadata_from_row(
                row
            )
        )

        embeddings.append(
            embedding
        )

    # Add in batches
    batch_size = 64

    for start in range(
        0,
        len(ids),
        batch_size,
    ):

        end = (
            start
            + batch_size
        )

        collection.add(
            ids=ids[start:end],
            documents=docs[start:end],
            metadatas=metas[start:end],
            embeddings=embeddings[start:end],
        )

    _update_index_metadata(
        len(ids)
    )

    return {
        "ok": True,
        "provider": "chromadb",
        "model":
            settings.ollama_embed_model,
        "message":
            "ChromaDB index rebuilt",
        "chunks":
            len(ids),
    }


# ============================================================
# INDEX METADATA
# ============================================================

def _update_index_metadata(
    count: int,
) -> None:

    try:

        metadata = {
            "provider":
                "chromadb",

            "embedding_model":
                settings.ollama_embed_model,

            "llm_model":
                settings.ollama_model,

            "chunks":
                count,

            "top_k":
                settings.retrieval_top_k,

            "final_context_k":
                getattr(
                    settings,
                    "final_context_k",
                    3,
                ),

            "chunk_size":
                settings.chunk_size,

            "chunk_overlap":
                settings.chunk_overlap,
        }

        (
            settings.vector_dir
            / "index_metadata.json"
        ).write_text(
            json.dumps(
                metadata,
                indent=2,
            ),
            encoding="utf-8",
        )

    except Exception as exc:

        print(
            "Could not update vector metadata:",
            exc,
        )


# ============================================================
# ADD ONE KNOWLEDGE PDF TO INDEX
# ============================================================

def add_upload_to_index(
    upload_id: str,
) -> dict:

    with get_conn() as conn:

        rows = conn.execute(
            """
            SELECT *
            FROM rag_chunks
            WHERE upload_id=?
            ORDER BY chunk_index
            """,
            (upload_id,),
        ).fetchall()

    chunks = [
        dict(row)
        for row in rows
    ]

    if not chunks:

        return {
            "ok": True,
            "chunks": 0,
        }

    client = _chroma_client()

    if client is None:

        return {
            "ok": False,
            "provider": "chromadb",
            "message":
                "chromadb not installed. "
                "Run pip install -r requirements.txt",
            "chunks": 0,
        }

    collection = (
        client
        .get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={
                "hnsw:space":
                    "cosine"
            },
        )
    )

    # Remove previous chunks belonging to this PDF
    try:

        collection.delete(
            where={
                "upload_id":
                    str(upload_id)
            }
        )

    except Exception:
        pass

    ids = []
    docs = []
    metas = []
    embeddings = []

    for chunk in chunks:

        cleaned = _clean_for_embedding(
            chunk.get(
                "chunk_text"
            )
            or ""
        )

        if not cleaned:
            continue

        chunk["chunk_text"] = cleaned
        chunk["source_kind"] = "pdf"

        text = _doc_text(
            chunk
        )

        embedding = (
            _ollama_embedding(
                text
            )
        )

        if not embedding:

            return {
                "ok": False,
                "provider": "chromadb",
                "message":
                    "Ollama embedding failed. "
                    f"Run: ollama pull "
                    f"{settings.ollama_embed_model}",
                "chunks": 0,
            }

        ids.append(
            str(
                chunk["id"]
            )
        )

        docs.append(
            text
        )

        metas.append(
            _metadata_from_row(
                chunk,
                source_kind="pdf",
            )
        )

        embeddings.append(
            embedding
        )

    if ids:

        batch_size = 64

        for start in range(
            0,
            len(ids),
            batch_size,
        ):

            end = (
                start
                + batch_size
            )

            collection.add(
                ids=ids[start:end],
                documents=docs[start:end],
                metadatas=metas[start:end],
                embeddings=embeddings[start:end],
            )

    _update_index_metadata(
        collection.count()
    )

    return {
        "ok": True,
        "provider": "chromadb",
        "model":
            settings.ollama_embed_model,
        "message":
            "ChromaDB upload chunks indexed",
        "chunks":
            len(ids),
    }


# ============================================================
# ADD QUESTION PAPER QUESTIONS
# ============================================================

def add_paper_questions_to_index(
    paper_id: str,
) -> dict:

    with get_conn() as conn:

        rows = conn.execute(
            """
            SELECT *
            FROM questions
            WHERE paper_id=?
            """,
            (paper_id,),
        ).fetchall()

    questions = [
        dict(row)
        for row in rows
    ]

    if not questions:

        return {
            "ok": True,
            "chunks": 0,
        }

    client = _chroma_client()

    if client is None:

        return {
            "ok": False,
            "provider": "chromadb",
            "message":
                "chromadb not installed. "
                "Run pip install -r requirements.txt",
            "chunks": 0,
        }

    collection = (
        client
        .get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={
                "hnsw:space":
                    "cosine"
            },
        )
    )

    try:

        collection.delete(
            where={
                "upload_id":
                    str(paper_id)
            }
        )

    except Exception:
        pass

    ids = []
    docs = []
    metas = []
    embeddings = []

    for question in questions:

        question_text = (
            question.get("text")
            or ""
        ).strip()

        if not question_text:
            continue

        question_type = (
            question.get(
                "question_type"
            )
            or ""
        ).lower()

        if question_type == "mcq":

            content = (
                f"Question: "
                f"{question_text}\n"

                f"Options: "
                f"A) {question.get('option_a') or ''} "
                f"B) {question.get('option_b') or ''} "
                f"C) {question.get('option_c') or ''} "
                f"D) {question.get('option_d') or ''}\n"

                f"Correct option: "
                f"{question.get('correct_option') or ''}\n"

                f"Answer: "
                f"{question.get('model_answer') or ''}\n"

                f"Explanation: "
                f"{question.get('explanation') or ''}"
            )

        else:

            content = (
                f"Question: "
                f"{question_text}\n"

                f"Model answer: "
                f"{question.get('model_answer') or ''}\n"

                f"Rubric: "
                f"{question.get('rubric_text') or ''}\n"

                f"Keywords: "
                f"{question.get('keywords_text') or ''}"
            )

        item = {
            "id":
                question["id"],

            "upload_id":
                paper_id,

            "upload_name":
                "Admin Question Bank",

            "chapter_id":
                question.get(
                    "chapter_id"
                )
                or "question-bank",

            "chapter":
                question.get(
                    "chapter_id"
                )
                or "Question Bank",

            "topic_id":
                question.get(
                    "topic_id"
                )
                or "question-bank-topic",

            "topic":
                question.get(
                    "mapped_topic"
                )
                or question.get(
                    "topic_id"
                )
                or "Uploaded Question",

            "subtopic_id":
                question.get(
                    "subtopic_id"
                )
                or "question-answer",

            "subtopic":
                question.get(
                    "subtopic_id"
                )
                or "Question Answer",

            "page_number": 0,

            "chunk_text":
                _clean_for_embedding(
                    content
                ),

            "source_kind":
                "question",

            "image_path":
                question.get(
                    "image_path"
                ),

            "solution_video_path":
                question.get(
                    "solution_video_path"
                ),
        }

        text = _doc_text(
            item
        )

        embedding = (
            _ollama_embedding(
                text
            )
        )

        if not embedding:

            return {
                "ok": False,
                "provider": "chromadb",
                "message":
                    "Ollama embedding failed. "
                    f"Run: ollama pull "
                    f"{settings.ollama_embed_model}",
                "chunks": 0,
            }

        ids.append(
            str(
                question["id"]
            )
        )

        docs.append(
            text
        )

        metas.append(
            _metadata_from_row(
                item,
                source_kind="question",
            )
        )

        embeddings.append(
            embedding
        )

    if ids:

        batch_size = 64

        for start in range(
            0,
            len(ids),
            batch_size,
        ):

            end = (
                start
                + batch_size
            )

            collection.add(
                ids=ids[start:end],
                documents=docs[start:end],
                metadatas=metas[start:end],
                embeddings=embeddings[start:end],
            )

    _update_index_metadata(
        collection.count()
    )

    return {
        "ok": True,
        "provider": "chromadb",
        "model":
            settings.ollama_embed_model,
        "message":
            "ChromaDB paper questions indexed",
        "chunks":
            len(ids),
    }


# ============================================================
# RESET INDEX
# ============================================================

def reset_index() -> dict:

    if settings.vector_dir.exists():

        shutil.rmtree(
            settings.vector_dir,
            ignore_errors=True,
        )

    settings.vector_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    return {
        "ok": True,
        "message":
            "Vector index reset",
    }


# ============================================================
# QUERY UNDERSTANDING
# ============================================================

def _is_definition_query(
    query: str,
) -> bool:
    """
    Detect questions asking for a direct definition.

    Examples:
    What is semiconductor?
    What are semiconductors?
    Define intrinsic semiconductor.
    Explain what a diode is.
    """

    query = (
        query
        .lower()
        .strip()
    )

    patterns = [
        r"^what\s+is\b",
        r"^what\s+are\b",
        r"^define\b",
        r"^definition\s+of\b",
        r"^what\s+do\s+you\s+mean\s+by\b",
        r"^meaning\s+of\b",
    ]

    return any(
        re.search(
            pattern,
            query,
        )
        for pattern
        in patterns
    )


def _extract_definition_term(
    query: str,
) -> str:
    """
    Extract the main concept from a definition-style question.

    Examples:
        "What are semiconductors?" -> "semiconductors"
        "What is a semiconductor?" -> "semiconductor"
        "Define intrinsic semiconductor." -> "intrinsic semiconductor"
    """

    query = (
        query
        or ""
    ).lower().strip()

    patterns = [
        r"^what\s+is\s+(?:a|an|the)?\s*(.+?)[?.!]*$",
        r"^what\s+are\s+(?:the)?\s*(.+?)[?.!]*$",
        r"^define\s+(?:a|an|the)?\s*(.+?)[?.!]*$",
        r"^definition\s+of\s+(?:a|an|the)?\s*(.+?)[?.!]*$",
        r"^what\s+do\s+you\s+mean\s+by\s+(.+?)[?.!]*$",
        r"^meaning\s+of\s+(.+?)[?.!]*$",
    ]

    for pattern in patterns:
        match = re.match(
            pattern,
            query,
            flags=re.I,
        )

        if match:
            return re.sub(
                r"\s+",
                " ",
                match.group(1),
            ).strip()

    return ""


def _definition_score(
    query: str,
    text: str,
) -> float:
    """
    Boost only chunks that define the actual concept asked about.

    Example:
        Query:
            What are semiconductors?

        Good:
            Semiconductors are materials ...

        Bad:
            Pure semiconductors are called intrinsic semiconductors.
    """

    if not _is_definition_query(
        query
    ):
        return 0.0

    target = _extract_definition_term(
        query
    )

    if not target:
        return 0.0

    text_lower = (
        text
        or ""
    ).lower().strip()

    if not text_lower:
        return 0.0

    target_variants = {
        target,
    }

    if target.endswith("ies") and len(target) > 3:
        target_variants.add(
            target[:-3] + "y"
        )
    elif target.endswith("s") and len(target) > 3:
        target_variants.add(
            target[:-1]
        )
    else:
        target_variants.add(
            target + "s"
        )

    score = 0.0

    for term in target_variants:
        escaped = re.escape(
            term
        )

        strong_patterns = [
            rf"(?:^|[.!?]\s+){escaped}\s+is\s+(?:a|an|the)\b",
            rf"(?:^|[.!?]\s+){escaped}\s+are\s+(?:a|an|the|materials|substances|devices)\b",
            rf"(?:^|[.!?]\s+){escaped}\s+(?:is|are)\s+defined\s+as\b",
            rf"(?:^|[.!?]\s+){escaped}\s+refers?\s+to\b",
            rf"(?:^|[.!?]\s+){escaped}\s+means?\b",
        ]

        if any(
            re.search(
                pattern,
                text_lower,
                flags=re.I,
            )
            for pattern in strong_patterns
        ):
            score = max(
                score,
                0.32,
            )

        looser_patterns = [
            rf"\b{escaped}\s+is\s+(?:a|an|the)\b",
            rf"\b{escaped}\s+are\s+(?:a|an|the|materials|substances|devices)\b",
            rf"\b{escaped}\s+(?:is|are)\s+defined\s+as\b",
            rf"\b{escaped}\s+refers?\s+to\b",
        ]

        if any(
            re.search(
                pattern,
                text_lower,
                flags=re.I,
            )
            for pattern in looser_patterns
        ):
            score = max(
                score,
                0.24,
            )

    subtype_prefixes = [
        "pure",
        "intrinsic",
        "extrinsic",
        "n-type",
        "p-type",
        "elemental",
        "compound",
        "organic",
        "inorganic",
    ]

    target_words = target.split()

    if target_words:
        head_term = re.escape(
            target_words[-1]
        )

        for prefix in subtype_prefixes:
            if re.search(
                rf"\b{re.escape(prefix)}\s+{head_term}\b",
                text_lower,
                flags=re.I,
            ):
                score -= 0.12

    if re.search(
        r"\b(?:pure|intrinsic|extrinsic|elemental|compound|organic|inorganic)\s+"
        r"semiconductors?\s+are\s+called\b",
        text_lower,
        flags=re.I,
    ):
        score -= 0.18

    return max(
        -0.25,
        min(
            0.32,
            score,
        ),
    )

# ============================================================
# TOPIC/QUERY WORD BOOST
# ============================================================

def _query_term_score(
    query: str,
    chunk: dict,
) -> float:
    """
    Score important query terms against topic/subtopic/content.

    For definition questions, generic question words are ignored
    so the score focuses on the actual Physics concept.
    """

    query_words = set(
        tokenize(
            query
        )
    )

    query_words -= {
        "what",
        "which",
        "who",
        "where",
        "when",
        "why",
        "how",
        "define",
        "definition",
        "meaning",
        "explain",
    }

    definition_term = _extract_definition_term(
        query
    )

    if definition_term:
        definition_words = set(
            tokenize(
                definition_term
            )
        )

        if definition_words:
            query_words = definition_words

    if not query_words:
        return 0.0

    searchable = " ".join(
        [
            str(
                chunk.get(
                    "topic"
                )
                or ""
            ),
            str(
                chunk.get(
                    "subtopic"
                )
                or ""
            ),
            str(
                chunk.get(
                    "chunk_text"
                )
                or ""
            ),
        ]
    )

    searchable_words = set(
        tokenize(
            searchable
        )
    )

    if not searchable_words:
        return 0.0

    return (
        len(
            query_words
            & searchable_words
        )
        / max(
            1,
            len(query_words),
        )
    )

# ============================================================
# DUPLICATE CHECK
# ============================================================

def _normalized_text(
    text: str,
) -> str:

    text = (
        text
        .lower()
        .strip()
    )

    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def _is_near_duplicate(
    first: str,
    second: str,
) -> bool:
    """
    Prevent nearly identical overlap chunks from being sent to Qwen.
    """

    a = _normalized_text(
        first
    )

    b = _normalized_text(
        second
    )

    if not a or not b:
        return False

    if a == b:
        return True

    # One chunk is almost completely contained inside another
    shorter = (
        a
        if len(a) < len(b)
        else b
    )

    longer = (
        b
        if len(a) < len(b)
        else a
    )

    if (
        len(shorter) > 80
        and shorter in longer
    ):
        return True

    # Token similarity
    words_a = set(
        tokenize(a)
    )

    words_b = set(
        tokenize(b)
    )

    if not words_a or not words_b:
        return False

    intersection = len(
        words_a
        & words_b
    )

    union = len(
        words_a
        | words_b
    )

    similarity = (
        intersection
        / max(
            1,
            union,
        )
    )

    return similarity >= 0.88


# ============================================================
# RERANK RESULTS
# ============================================================

def _rerank_results(
    query: str,
    candidates: list[dict],
    final_k: int,
) -> list[dict]:
    """
    Hybrid reranking.

    Final score considers:

    - Chroma semantic similarity
    - exact query-term overlap
    - definition-style content
    - topic/subtopic match

    This helps cases such as:

    Query:
        What are semiconductors?

    Candidate A:
        Semiconductors are materials whose conductivity...

    Candidate B:
        Most currently available semiconductor devices...

    Candidate A receives a stronger final score.
    """

    scored = []

    for chunk in candidates:

        text = (
            chunk.get(
                "chunk_text"
            )
            or ""
        )

        semantic_score = float(
            chunk.get(
                "score"
            )
            or 0.0
        )

        lexical_score = overlap_score(
            query,
            text,
        )

        query_term_score = (
            _query_term_score(
                query,
                chunk,
            )
        )

        definition_boost = (
            _definition_score(
                query,
                text,
            )
        )

        # ----------------------------------------------------
        # Hybrid score
        #
        # Semantic similarity still has the largest weight.
        # ----------------------------------------------------

        final_score = (
            semantic_score * 0.65
            + lexical_score * 0.15
            + query_term_score * 0.10
            + definition_boost
        )

        chunk["semantic_score"] = round(
            semantic_score,
            4,
        )

        chunk["lexical_score"] = round(
            lexical_score,
            4,
        )

        chunk["query_term_score"] = round(
            query_term_score,
            4,
        )

        chunk["definition_boost"] = round(
            definition_boost,
            4,
        )

        chunk["rerank_score"] = round(
            final_score,
            4,
        )

        scored.append(
            chunk
        )

    scored.sort(
        key=lambda item:
            item.get(
                "rerank_score",
                0.0,
            ),
        reverse=True,
    )

    # --------------------------------------------------------
    # Remove duplicate overlap chunks
    # --------------------------------------------------------

    selected = []

    for candidate in scored:

        candidate_text = (
            candidate.get(
                "chunk_text"
            )
            or ""
        )

        duplicate = any(
            _is_near_duplicate(
                candidate_text,
                existing.get(
                    "chunk_text"
                )
                or "",
            )
            for existing
            in selected
        )

        if duplicate:
            continue

        selected.append(
            candidate
        )

        if (
            len(selected)
            >= final_k
        ):
            break

    return selected


# ============================================================
# SEARCH
# ============================================================

def search(
    query: str,
    top_k: int = 5,
    chapter_id: str | None = None,
    topic_id: str | None = None,
) -> list[dict]:
    """
    Search Chroma and rerank candidates.

    Important:

    top_k is the FINAL number returned.

    Chroma first retrieves a larger candidate pool so that
    a useful definition chunk is not lost before reranking.
    """

    query = (
        query
        or ""
    ).strip()

    if not query:
        return []

    collection = _collection(
        create=False
    )

    # --------------------------------------------------------
    # Rebuild automatically if collection is missing
    # --------------------------------------------------------

    if (
        collection is None
        or collection.count() == 0
    ):

        rebuild_index()

        collection = _collection(
            create=False
        )

    if (
        collection is None
        or collection.count() == 0
    ):
        return []

    # --------------------------------------------------------
    # Query embedding
    # --------------------------------------------------------

    query_embedding = (
        _ollama_embedding(
            query
        )
    )

    if not query_embedding:
        return []

    # --------------------------------------------------------
    # Metadata filtering
    # --------------------------------------------------------

    filters = []

    if (
        chapter_id
        and chapter_id != "all"
    ):

        filters.append(
            {
                "chapter_id":
                    str(
                        chapter_id
                    )
            }
        )

    if (
        topic_id
        and topic_id != "all"
    ):

        filters.append(
            {
                "topic_id":
                    str(
                        topic_id
                    )
            }
        )

    where = None

    if len(filters) == 1:

        where = (
            filters[0]
        )

    elif len(filters) > 1:

        where = {
            "$and":
                filters
        }

    # --------------------------------------------------------
    # IMPORTANT:
    # Retrieve more candidates than we finally return.
    # --------------------------------------------------------

    final_k = max(
        1,
        int(top_k),
    )

    # Example:
    #
    # final_k = 3
    # Chroma candidates = 9
    #
    # final_k = 6
    # Chroma candidates = 18
    #
    candidate_k = max(
        15,
        final_k * 5,
    )

    # Never request more than collection count
    candidate_k = min(
        candidate_k,
        collection.count(),
    )

    result = collection.query(
        query_embeddings=[
            query_embedding
        ],
        n_results=(
            candidate_k
        ),
        where=where,
        include=[
            "documents",
            "metadatas",
            "distances",
        ],
    )

    documents = (
        result.get(
            "documents"
        )
        or [[]]
    )[0]

    metadatas = (
        result.get(
            "metadatas"
        )
        or [[]]
    )[0]

    distances = (
        result.get(
            "distances"
        )
        or [[]]
    )[0]

    candidates = []

    for (
        document,
        metadata,
        distance,
    ) in zip(
        documents,
        metadatas,
        distances,
    ):

        if not document:
            continue

        # ----------------------------------------------------
        # Chroma cosine distance -> similarity
        # ----------------------------------------------------

        if distance is None:

            semantic_score = 0.0

        else:

            semantic_score = max(
                0.0,
                1.0
                - float(
                    distance
                ),
            )

        # ----------------------------------------------------
        # Extract actual textbook content
        # ----------------------------------------------------

        chunk_text = document

        content_match = re.search(
            r"Content:\s*(.+)$",
            document,
            re.DOTALL
            | re.IGNORECASE,
        )

        if content_match:

            chunk_text = (
                content_match
                .group(1)
                .strip()
            )

        cleaned_chunk = (
            _clean_for_embedding(
                chunk_text
            )
        )

        if not cleaned_chunk:
            continue

        candidates.append(
            {
                "id":
                    metadata.get(
                        "id"
                    ),

                "source_kind":
                    metadata.get(
                        "source_kind",
                        "pdf",
                    ),

                "upload_id":
                    metadata.get(
                        "upload_id"
                    ),

                "upload_name":
                    metadata.get(
                        "upload_name"
                    ),

                "chapter_id":
                    metadata.get(
                        "chapter_id"
                    ),

                "chapter":
                    metadata.get(
                        "chapter"
                    ),

                "topic_id":
                    metadata.get(
                        "topic_id"
                    ),

                "topic":
                    metadata.get(
                        "topic"
                    ),

                "subtopic_id":
                    metadata.get(
                        "subtopic_id"
                    ),

                "subtopic":
                    metadata.get(
                        "subtopic"
                    ),

                "page_number":
                    metadata.get(
                        "page_number"
                    )
                    or 0,

                "chunk_text":
                    cleaned_chunk,

                "score":
                    round(
                        semantic_score,
                        4,
                    ),

                "image_path":
                    metadata.get(
                        "image_path"
                    )
                    or "",

                "solution_video_path":
                    metadata.get(
                        "solution_video_path"
                    )
                    or "",
            }
        )

    # --------------------------------------------------------
    # RERANK
    # --------------------------------------------------------

    reranked = (
        _rerank_results(
            query=query,
            candidates=candidates,
            final_k=final_k,
        )
    )

    # --------------------------------------------------------
    # Debugging
    #
    # Keep this while testing.
    # --------------------------------------------------------

    print(
        "\n"
        "=============================================="
    )

    print(
        "RAG QUERY:",
        query,
    )

    print(
        "CHROMA CANDIDATES:",
        len(candidates),
    )

    print(
        "FINAL RESULTS:",
        len(reranked),
    )

    for index, chunk in enumerate(
        reranked,
        start=1,
    ):

        print(
            f"\n--- RANK {index} ---"
        )

        print(
            "Topic:",
            chunk.get(
                "topic"
            ),
        )

        print(
            "Page:",
            chunk.get(
                "page_number"
            ),
        )

        print(
            "Semantic:",
            chunk.get(
                "semantic_score"
            ),
        )

        print(
            "Lexical:",
            chunk.get(
                "lexical_score"
            ),
        )

        print(
            "Query term:",
            chunk.get(
                "query_term_score"
            ),
        )

        print(
            "Definition boost:",
            chunk.get(
                "definition_boost"
            ),
        )

        print(
            "Final:",
            chunk.get(
                "rerank_score"
            ),
        )

        preview = (
            chunk.get(
                "chunk_text"
            )
            or ""
        )[:500]

        print(
            "Text:",
            preview,
        )

    print(
        "=============================================="
        "\n"
    )

    return reranked


# ============================================================
# INDEX STATUS
# ============================================================

def index_status() -> dict:

    metadata_path = (
        settings.vector_dir
        / "index_metadata.json"
    )

    metadata = {}

    if metadata_path.exists():

        try:

            metadata = json.loads(
                metadata_path
                .read_text(
                    encoding="utf-8"
                )
            )

        except Exception:
            metadata = {}

    count = 0

    try:

        collection = _collection(
            create=False
        )

        count = (
            collection.count()
            if collection
            else 0
        )

    except Exception:
        count = 0

    return {
        "vectorDatabase":
            "ChromaDB",

        "embeddingProvider":
            "ollama",

        "embeddingModel":
            settings.ollama_embed_model,

        "llmModel":
            settings.ollama_model,

        "topK":
            settings.retrieval_top_k,

        "finalContextK":
            getattr(
                settings,
                "final_context_k",
                3,
            ),

        "chunkSize":
            settings.chunk_size,

        "chunkOverlap":
            settings.chunk_overlap,

        "chromaIndex":
            count > 0,

        "chunks":
            count,

        "metadata":
            metadata,
    }