import random
import time

delay = random.uniform(10, 12)
time.sleep(delay)

import re

from app.core.config import settings
from app.database.db import get_conn
from app.services.slm_service import (
    ask_ollama,
    simple_student_prompt,
)
from app.services.vector_service import (
    search as vector_search,
)

from app.services.verified_faq import (
    lookup_verified_faq,
)
from app.utils.text_utils import (
    overlap_score,
    extract_formula,
)


NOT_FOUND_MESSAGE = (
    "This exact answer is not found in the uploaded PDF context."
)


# ============================================================
# RETRIEVAL
# ============================================================

def retrieve(
    query: str,
    top_k: int | None = None,
    chapter_id: str | None = None,
    topic_id: str | None = None,
) -> list[dict]:
    """
    Retrieve the most relevant RAG chunks.

    Primary:
        ChromaDB + nomic-embed-text + reranking.

    Fallback:
        SQLite lexical matching only if vector retrieval fails.
    """

    query = (query or "").strip()

    if not query:
        return []

    requested_k = (
        top_k
        or settings.retrieval_top_k
    )

    # --------------------------------------------------------
    # Primary vector retrieval
    # --------------------------------------------------------

    results = vector_search(
        query=query,
        top_k=requested_k,
        chapter_id=chapter_id,
        topic_id=topic_id,
    )

    if results:
        return results

    # --------------------------------------------------------
    # SQLite lexical fallback
    # --------------------------------------------------------

    params = []
    filters = []

    sql = """
        SELECT *
        FROM rag_chunks
    """

    if (
        chapter_id
        and chapter_id != "all"
    ):
        filters.append(
            "chapter_id=?"
        )

        params.append(
            chapter_id
        )

    if (
        topic_id
        and topic_id != "all"
    ):
        filters.append(
            "topic_id=?"
        )

        params.append(
            topic_id
        )

    if filters:
        sql += (
            " WHERE "
            + " AND ".join(filters)
        )

    with get_conn() as conn:

        rows = conn.execute(
            sql,
            params,
        ).fetchall()

    chunks = [
        dict(row)
        for row in rows
    ]

    scored = []

    for chunk in chunks:

        text = (
            chunk.get(
                "chunk_text"
            )
            or ""
        )

        score = overlap_score(
            query,
            text,
        )

        if score > 0:

            chunk["score"] = round(
                score,
                4,
            )

            chunk["rerank_score"] = round(
                score,
                4,
            )

            scored.append(
                chunk
            )

    scored.sort(
        key=lambda item:
            item.get(
                "score",
                0.0,
            ),
        reverse=True,
    )

    return scored[
        :requested_k
    ]


# ============================================================
# SELECT FINAL CONTEXT
# ============================================================

def _select_final_chunks(
    chunks: list[dict],
) -> list[dict]:
    """
    Vector service may retrieve/rerank several candidates.

    Only the best FINAL_CONTEXT_K chunks are passed to Qwen.
    """

    if not chunks:
        return []

    final_k = getattr(
        settings,
        "final_context_k",
        3,
    )

    final_k = max(
        1,
        int(final_k),
    )

    # Vector service already sorts by rerank score.
    # Sort again defensively.
    ordered = sorted(
        chunks,
        key=lambda chunk: float(
            chunk.get(
                "rerank_score",
                chunk.get(
                    "score",
                    0.0,
                ),
            )
            or 0.0
        ),
        reverse=True,
    )

    return ordered[:final_k]


# ============================================================
# CONTEXT CLEANING
# ============================================================

def _clean_chunk_text(
    text: str,
) -> str:

    text = (
        text
        or ""
    ).strip()

    if not text:
        return ""

    # Normalize whitespace
    text = re.sub(
        r"[ \t]+",
        " ",
        text,
    )

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    # Remove app metadata if somehow present
    text = re.sub(
        r"(?mi)^\s*Chapter\s*[:=].*$",
        "",
        text,
    )

    text = re.sub(
        r"(?mi)^\s*Topic\s*[:=].*$",
        "",
        text,
    )

    text = re.sub(
        r"(?mi)^\s*Subtopic\s*[:=].*$",
        "",
        text,
    )

    return text.strip()


# ============================================================
# COMPACT CONTEXT
# ============================================================

def _compact_context(
    chunks: list[dict],
) -> str:
    """
    Build a compact context for Qwen.

    Important:
    - only final top chunks
    - no repeated metadata
    - no giant context
    """

    blocks = []

    seen = set()

    for chunk in chunks:

        text = _clean_chunk_text(
            chunk.get(
                "chunk_text"
            )
            or ""
        )

        if not text:
            continue

        # Prevent exact duplicate blocks
        normalized = re.sub(
            r"\s+",
            " ",
            text.lower(),
        ).strip()

        if normalized in seen:
            continue

        seen.add(
            normalized
        )

        topic = (
            chunk.get(
                "topic"
            )
            or ""
        ).strip()

        page = (
            chunk.get(
                "page_number"
            )
            or 0
        )

        # Keep metadata lightweight.
        header_parts = []

        if topic:
            header_parts.append(
                f"Topic: {topic}"
            )

        if page:
            header_parts.append(
                f"Page: {page}"
            )

        header = (
            " | ".join(
                header_parts
            )
        )

        if header:

            block = (
                f"{header}\n"
                f"{text}"
            )

        else:

            block = text

        # 450-size chunks are already small.
        # This cap only protects against bad legacy chunks.
        blocks.append(
            block[:1200]
        )

    return "\n\n---\n\n".join(
        blocks
    )


# ============================================================
# RETRIEVAL CONFIDENCE
# ============================================================

def _retrieval_confidence(
    chunks: list[dict],
    question: str,
) -> float:
    """
    Produce a simple UI confidence value.

    This is not a calibrated probability.
    It is only a retrieval-quality indicator.
    """

    if not chunks:
        return 0.0

    first = chunks[0]

    retrieval_score = float(
        first.get(
            "rerank_score",
            first.get(
                "score",
                0.0,
            ),
        )
        or 0.0
    )

    lexical = overlap_score(
        question,
        first.get(
            "chunk_text"
        )
        or "",
    )

    combined = (
        retrieval_score * 0.75
        + lexical * 0.25
    )

    return round(
        max(
            0.0,
            min(
                0.98,
                combined,
            ),
        ),
        2,
    )


# ============================================================
# MAIN RAG FUNCTION
# ============================================================

def ask_rag(
    question: str,
    student_id: str | None = None,
    chapter_id: str | None = None,
    topic_id: str | None = None,
    top_k: int | None = None,
) -> dict:
    """
    Main student RAG pipeline.

    Flow:

    question
        -> verified FAQ check
        -> if matched: return verified answer immediately
        -> otherwise vector retrieval
        -> reranking
        -> best 3 chunks
        -> compact context
        -> Qwen3:4b
        -> final grounded answer
    """

    question = (
        question
        or ""
    ).strip()

    if not question:

        return {
            "answer":
                "Please type a Physics question.",

            "retrievedChunks":
                [],

            "confidence":
                0,
        }

    # --------------------------------------------------------
    # VERIFIED FAQ FIRST
    # --------------------------------------------------------
    # Common Class 12 Semiconductor board-style questions are
    # answered from the verified FAQ layer before Chroma/Qwen.
    # If there is no safe FAQ match, the normal RAG pipeline runs.
    faq = lookup_verified_faq(
        question
    )

    if faq:
        print(
            "\n"
            "=============================================="
        )
        print(
            "VERIFIED FAQ MATCH"
        )
        print(
            "Question:",
            question,
        )
        print(
            "FAQ ID:",
            faq.get(
                "id"
            ),
        )
        print(
            "Topic:",
            faq.get(
                "topic"
            ),
        )
        print(
            "Marks:",
            faq.get(
                "marks"
            ),
        )
        print(
            "Match type:",
            faq.get(
                "match_type"
            ),
        )
        print(
            "Match score:",
            faq.get(
                "match_score"
            ),
        )
        print(
            "Answer:",
            faq.get(
                "answer"
            ),
        )
        print(
            "=============================================="
            "\n"
        )

        return {
            "query":
                question,

            "answer":
                faq.get(
                    "answer"
                )
                or NOT_FOUND_MESSAGE,

            "topic":
                faq.get(
                    "topic"
                )
                or "Semiconductor Electronics",

            "sourcePage":
                None,

            "chapter":
                "Semiconductor Electronics",

            "confidence":
                1.0,

            "formula":
                "",

            # Keep student frontend clean.
            "retrievedChunks":
                [],

            # No Chroma chunks were needed for FAQ answers.
            "retrievedCount":
                0,

            # Helpful for debugging / future UI use.
            "source":
                "verified_faq",

            "faqId":
                faq.get(
                    "id"
                ),

            "marks":
                faq.get(
                    "marks"
                ),

            "matchType":
                faq.get(
                    "match_type"
                ),

            "matchScore":
                faq.get(
                    "match_score"
                ),
        }

    # --------------------------------------------------------
    # Retrieve candidates
    # --------------------------------------------------------

    retrieval_k = (
        top_k
        or settings.retrieval_top_k
    )

    chunks = retrieve(
        query=question,
        top_k=retrieval_k,
        chapter_id=chapter_id,
        topic_id=topic_id,
    )

    if not chunks:

        return {
            "query":
                question,

            "answer":
                (
                    "No processed knowledge PDF/chunks were found "
                    "for this question. Ask the administrator to "
                    "upload and process a Knowledge PDF first."
                ),

            "topic":
                "No knowledge base",

            "sourcePage":
                None,

            "chapter":
                "No processed PDF",

            "confidence":
                0,

            "formula":
                "",

            "retrievedChunks":
                [],

            "retrievedCount":
                0,
        }

    # --------------------------------------------------------
    # Only best 3 chunks go to Qwen
    # --------------------------------------------------------

    final_chunks = (
        _select_final_chunks(
            chunks
        )
    )

    context = (
        _compact_context(
            final_chunks
        )
    )

    if not context:

        return {
            "query":
                question,

            "answer":
                NOT_FOUND_MESSAGE,

            "topic":
                "Physics Topic",

            "sourcePage":
                None,

            "chapter":
                "Uploaded Physics PDF",

            "confidence":
                0,

            "formula":
                "",

            "retrievedChunks":
                [],

            "retrievedCount":
                0,
        }

    # --------------------------------------------------------
    # Call Qwen
    # --------------------------------------------------------

    prompt = simple_student_prompt(
        question,
        context,
    )

    llm_answer = ask_ollama(
        prompt,

        # Faster than previous 512-token generation.
        max_tokens=getattr(
            settings,
            "ollama_num_predict",
            180,
        ),
    )

    # --------------------------------------------------------
    # Important:
    #
    # DO NOT summarize Qwen thinking.
    # DO NOT create an answer from random context sentences.
    # --------------------------------------------------------

    if llm_answer:

        answer = re.sub(
            r"\s+",
            " ",
            llm_answer,
        ).strip()

    else:

        answer = (
            NOT_FOUND_MESSAGE
        )

    # --------------------------------------------------------
    # Remove accidental duplicated answer text
    # --------------------------------------------------------

    answer = _remove_repeated_sentences(
        answer
    )

    # --------------------------------------------------------
    # Source metadata
    # --------------------------------------------------------

    first = final_chunks[0]

    formula = (
        extract_formula(
            context
        )
        or ""
    )

    confidence = (
        _retrieval_confidence(
            final_chunks,
            question,
        )
    )

    # Keep debug/source information internally.
    retrieved_debug = []

    for chunk in final_chunks:

        retrieved_debug.append(
            {
                "id":
                    chunk.get(
                        "id"
                    ),

                "page":
                    chunk.get(
                        "page_number"
                    )
                    or 1,

                "chapter":
                    chunk.get(
                        "chapter"
                    ),

                "topic":
                    chunk.get(
                        "topic"
                    ),

                "subtopic":
                    chunk.get(
                        "subtopic"
                    ),

                "score":
                    chunk.get(
                        "rerank_score",
                        chunk.get(
                            "score",
                            0,
                        ),
                    ),

                "text":
                    (
                        chunk.get(
                            "chunk_text"
                        )
                        or ""
                    )[:650],
            }
        )

    # --------------------------------------------------------
    # Backend debugging
    # --------------------------------------------------------

    print(
        "\n"
        "=============================================="
    )

    print(
        "FINAL RAG CONTEXT FOR QWEN"
    )

    print(
        "Question:",
        question,
    )

    print(
        "Chunks sent to Qwen:",
        len(
            final_chunks
        ),
    )

    for index, chunk in enumerate(
        final_chunks,
        start=1,
    ):

        print(
            f"\n--- CONTEXT {index} ---"
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
            "Score:",
            chunk.get(
                "rerank_score",
                chunk.get(
                    "score"
                ),
            ),
        )

        print(
            (
                chunk.get(
                    "chunk_text"
                )
                or ""
            )[:500]
        )

    print(
        "\nQwen answer:",
        answer,
    )

    print(
        "=============================================="
        "\n"
    )

    return {
        "query":
            question,

        "answer":
            answer,

        "topic":
            first.get(
                "topic"
            )
            or "Physics Topic",

        "sourcePage":
            first.get(
                "page_number"
            )
            or 1,

        "chapter":
            first.get(
                "chapter"
            )
            or "Uploaded Physics PDF",

        "confidence":
            confidence,

        "formula":
            formula,

        # Keep student frontend clean.
        "retrievedChunks":
            [],

        # Useful for UI/debugging.
        "retrievedCount":
            len(
                retrieved_debug
            ),
    }


# ============================================================
# DUPLICATE ANSWER CLEANUP
# ============================================================

def _remove_repeated_sentences(
    text: str,
) -> str:
    """
    Remove exact repeated sentences from the final answer.

    Example:

    "Semiconductors are ... .
     Semiconductors are ... ."

    becomes one sentence.
    """

    text = (
        text
        or ""
    ).strip()

    if not text:
        return ""

    sentences = re.split(
        r"(?<=[.!?])\s+",
        text,
    )

    output = []
    seen = set()

    for sentence in sentences:

        sentence = (
            sentence
            .strip()
        )

        if not sentence:
            continue

        normalized = re.sub(
            r"\s+",
            " ",
            sentence.lower(),
        ).strip()

        if normalized in seen:
            continue

        seen.add(
            normalized
        )

        output.append(
            sentence
        )

    return " ".join(
        output
    ).strip()