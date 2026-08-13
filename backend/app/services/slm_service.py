import json
import re
import urllib.request

from app.core.config import settings


NOT_FOUND_MESSAGE = (
    "This exact answer is not found in the uploaded PDF context."
)


# ============================================================
# CLEAN FINAL LLM TEXT
# ============================================================

def clean_llm_text(
    text: str | None,
) -> str | None:
    """
    Clean Qwen output before showing it to the student.

    Important:
    - never use the thinking field as the answer
    - remove accidental reasoning markers
    - remove duplicated formatting noise
    """

    if not text:
        return None

    text = str(text).strip()

    if not text:
        return None

    # --------------------------------------------------------
    # Remove explicit <think>...</think> blocks if a model
    # unexpectedly returns them inside content.
    # --------------------------------------------------------

    text = re.sub(
        r"(?is)<think>.*?</think>",
        "",
        text,
    )

    # Remove common reasoning labels
    text = re.sub(
        r"(?im)^\s*(thinking|analysis|reasoning)\s*:.*$",
        "",
        text,
    )

    # --------------------------------------------------------
    # Remove common meta/reasoning lines
    # --------------------------------------------------------

    bad_line_patterns = [
        r"^\s*we are given.*$",
        r"^\s*i need to.*$",
        r"^\s*first,.*$",
        r"^\s*let'?s .*",
        r"^\s*from chunk.*$",
        r"^\s*chunk \d+.*$",
        r"^\s*the context.*$",
        r"^\s*the question.*$",
        r"^\s*final answer\s*:?\s*$",
        r"^\s*answer\s*:?\s*$",
        r"^\s*based on.*context.*$",
    ]

    cleaned_lines = []

    for line in text.splitlines():

        line = line.strip()

        if not line:
            continue

        if any(
            re.match(
                pattern,
                line,
                flags=re.I,
            )
            for pattern
            in bad_line_patterns
        ):
            continue

        # Remove terminal / box characters
        if line.startswith(
            (
                "│",
                "╭",
                "╰",
                "─",
            )
        ):
            continue

        cleaned_lines.append(
            line
        )

    text = "\n".join(
        cleaned_lines
    ).strip()

    # --------------------------------------------------------
    # If model gives "Final answer: ..."
    # keep only text after the marker.
    # --------------------------------------------------------

    match = re.search(
        r"(?is)(?:final\s+answer|answer)\s*[:\-]\s*(.+)$",
        text,
    )

    if match:
        text = match.group(1).strip()

    # Remove markdown bold markers
    text = text.replace(
        "**",
        "",
    )

    # Remove repeated whitespace
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

    text = text.strip()

    return (
        text
        if text
        else None
    )


# ============================================================
# REMOVE DUPLICATED SENTENCES
# ============================================================

def _remove_duplicate_sentences(
    text: str,
) -> str:
    """
    Remove exact repeated sentences.

    This protects against responses such as:

    "Semiconductors are...
     Semiconductors are..."
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

        sentence = sentence.strip()

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


# ============================================================
# FINAL STUDENT ANSWER
# ============================================================

def final_answer_only(
    text: str | None,
    max_lines: int = 4,
    max_chars: int = 900,
) -> str | None:
    """
    Convert model output into a short student-facing answer.
    """

    text = clean_llm_text(
        text
    )

    if not text:
        return None

    # --------------------------------------------------------
    # Preserve exact not-found message
    # --------------------------------------------------------

    if (
        "this exact answer is not found in the uploaded pdf context"
        in text.lower()
    ):
        return NOT_FOUND_MESSAGE

    # Remove markdown table rows if any
    lines = []

    for line in text.splitlines():

        line = line.strip(
            " -•\t"
        )

        if not line:
            continue

        if (
            line.startswith("|")
            and line.endswith("|")
        ):
            continue

        # Do not expose RAG internals
        if re.search(
            r"\b("
            r"chunk|"
            r"retrieved|"
            r"context|"
            r"scan|"
            r"provided pdf|"
            r"metadata"
            r")\b",
            line,
            flags=re.I,
        ):
            continue

        lines.append(
            line
        )

    if not lines:
        return None

    text = " ".join(
        lines
    )

    text = _remove_duplicate_sentences(
        text
    )

    # --------------------------------------------------------
    # Limit response size
    # --------------------------------------------------------

    sentences = [
        sentence.strip()
        for sentence
        in re.split(
            r"(?<=[.!?])\s+",
            text,
        )
        if sentence.strip()
    ]

    if sentences:

        text = " ".join(
            sentences[:max_lines]
        )

    return (
        text[:max_chars]
        .strip()
        or None
    )


# ============================================================
# OLLAMA REQUEST
# ============================================================

def ask_ollama(
    prompt: str,
    system: str | None = None,
    max_tokens: int | None = None,
) -> str | None:
    """
    Call qwen3:4b through Ollama.

    Speed optimizations:
    - think=False
    - low temperature
    - short num_predict
    - compact context
    - do NOT use thinking field as answer
    """

    system = system or (
        "You are a Class 12 Physics tutor. "
        "Answer only from the supplied textbook context. "
        "Give the student's final answer directly. "
        "Do not show reasoning, thoughts, analysis, metadata, "
        "chapter labels, topic labels, chunk information, or notes. "
        "For definition questions, give the definition first. "
        "Do not repeat sentences. "
        f"If the answer is unsupported, return exactly: "
        f"{NOT_FOUND_MESSAGE}"
    )

    if max_tokens is None:
        max_tokens = getattr(
            settings,
            "ollama_num_predict",
            80,
        )

    # ========================================================
    # LOCAL OLLAMA
    # ========================================================

    if settings.use_ollama:

        url = (
            f"{settings.ollama_url.rstrip('/')}"
            "/api/chat"
        )

        payload = {
            "model":
                settings.ollama_model,

            "messages": [
                {
                    "role":
                        "system",

                    "content":
                        system,
                },
                {
                    "role":
                        "user",

                    "content":
                        prompt,
                },
            ],

            "stream":
                False,

            # ------------------------------------------------
            # IMPORTANT FOR QWEN3 SPEED
            # ------------------------------------------------
            # Disable Qwen reasoning for faster RAG responses.
            "think":
                False,

            # Keep the model loaded between student questions.
            "keep_alive":
                "10m",

            "options": {
                "temperature":
                    getattr(
                        settings,
                        "ollama_temperature",
                        0.1,
                    ),

                "num_ctx":
                    getattr(
                        settings,
                        "ollama_num_ctx",
                        2048,
                    ),

                "num_predict":
                    max_tokens,
            },
        }

        headers = {
            "Content-Type":
                "application/json"
        }

        request = urllib.request.Request(
            url,
            data=json.dumps(
                payload
            ).encode(
                "utf-8"
            ),
            headers=headers,
            method="POST",
        )

        try:

            with urllib.request.urlopen(
                request,

                # Temporary diagnostic timeout.
                # Once stable, this can be reduced again.
                timeout=180,
            ) as response:

                data = json.loads(
                    response
                    .read()
                    .decode(
                        "utf-8"
                    )
                )

            message = (
                data.get(
                    "message"
                )
                or {}
            )

            # ------------------------------------------------
            # VERY IMPORTANT
            #
            # Use ONLY final answer content.
            #
            # Never do:
            #
            # answer = message["thinking"]
            #
            # ------------------------------------------------

            answer = (
                message.get(
                    "content"
                )
                or ""
            ).strip()

            if not answer:
                return None

            return final_answer_only(
                answer,
                max_lines=4,
            )

        except Exception as exc:

            print(
                "Ollama API Error:",
                exc,
            )

            return None

    # ========================================================
    # HUGGINGFACE FALLBACK
    # ========================================================

    model = (
        settings.huggingface_model
    )

    url = (
        "https://api-inference.huggingface.co/"
        f"models/{model}/v1/chat/completions"
    )

    headers = {
        "Content-Type":
            "application/json"
    }

    if settings.huggingface_token:

        headers[
            "Authorization"
        ] = (
            f"Bearer "
            f"{settings.huggingface_token}"
        )

    payload = {
        "model":
            model,

        "messages": [
            {
                "role":
                    "system",

                "content":
                    system,
            },
            {
                "role":
                    "user",

                "content":
                    prompt,
            },
        ],

        "max_tokens":
            max_tokens,

        "temperature":
            getattr(
                settings,
                "ollama_temperature",
                0.1,
            ),
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(
            payload
        ).encode(
            "utf-8"
        ),
        headers=headers,
        method="POST",
    )

    try:

        with urllib.request.urlopen(
            request,
            timeout=90,
        ) as response:

            data = json.loads(
                response
                .read()
                .decode(
                    "utf-8"
                )
            )

        choices = (
            data.get(
                "choices"
            )
            or []
        )

        if not choices:
            return None

        message = (
            choices[0]
            .get(
                "message"
            )
            or {}
        )

        answer = (
            message.get(
                "content"
            )
            or ""
        )

        return final_answer_only(
            answer,
            max_lines=4,
        )

    except Exception as exc:

        print(
            "HF API Error:",
            exc,
        )

        return None


# ============================================================
# STUDENT RAG PROMPT
# ============================================================

def simple_student_prompt(question: str, context: str) -> str:
    return f"""
TEXTBOOK INFORMATION:

{context[:2200]}

QUESTION:
{question}

TASK:
Answer the student's question using ONLY the textbook information above.

RULES:
- Give ONLY the answer. No introduction.
- For "What is", "What are", "Define", or "Definition of":
  write ONE clear definition first.
- Maximum 2-3 sentences.
- Do not say "according to the textbook".
- Do not say "looking at the textbook".
- Do not mention pages.
- Do not mention sections.
- Do not mention retrieved information.
- Do not mention context or chunks.
- Do not explain where the information came from.
- Do not list unrelated facts or examples unless needed.
- Do not repeat information.
- Do not add outside knowledge.
- You may combine statements from the textbook into one concise answer.

If the textbook information cannot answer the question, return exactly:

{NOT_FOUND_MESSAGE}

ANSWER:
""".strip()