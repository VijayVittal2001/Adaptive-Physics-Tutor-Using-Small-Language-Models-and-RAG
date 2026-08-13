import re
import hashlib
from collections import Counter


# ---------------------------------------------------------
# Common words ignored during keyword matching
# ---------------------------------------------------------

STOPWORDS = set(
    """
    a an and are as at be by for from has have he in into is it its
    of on or that the their them then there these this to was were
    will with within without yes no if do does did can could should
    would may might i you we they your our
    """.split()
)


# ---------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------

def clean_text(text: str) -> str:
    """
    Clean extracted PDF text while preserving paragraph structure.
    """

    if not text:
        return ""

    # Remove null characters and tabs
    text = text.replace("\x00", " ")
    text = text.replace("\t", " ")

    # Join words broken across lines:
    # semi-
    # conductor
    # becomes semiconductor
    text = re.sub(
        r"(?<=\w)-\s*\n\s*(?=\w)",
        "",
        text,
    )

    # Also handle hyphen followed by spaces
    text = re.sub(
        r"(?<=\w)-\s+(?=\w)",
        "",
        text,
    )

    # Remove common NCERT reprint text
    text = re.sub(
        r"Reprint\s+\d{4}\s*-\s*\d{2}",
        " ",
        text,
        flags=re.I,
    )

    # Remove isolated textbook headers
    text = re.sub(
        r"(?mi)^\s*(Physics|NCERT)\s*\d*\s*$",
        " ",
        text,
    )

    # Remove obvious page-number lines
    text = re.sub(
        r"(?mi)^\s*Page\s*\d+.*$",
        " ",
        text,
    )

    text = re.sub(
        r"(?m)^\s*\d+\s*$",
        "",
        text,
    )

    # Replace repeated horizontal spaces
    text = re.sub(
        r"[ \u00a0]+",
        " ",
        text,
    )

    # Remove spaces immediately before punctuation
    text = re.sub(
        r"\s+([,.;:!?])",
        r"\1",
        text,
    )

    # Preserve paragraph separation, but remove excessive blank lines
    text = re.sub(
        r"\n[ \t]+\n",
        "\n\n",
        text,
    )

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text,
    )

    return text.strip()


# ---------------------------------------------------------
# Tokenization
# ---------------------------------------------------------

def tokenize(text: str) -> list[str]:
    """
    Convert text into useful searchable words.
    """

    if not text:
        return []

    words = re.findall(
        r"[A-Za-z][A-Za-z0-9_+\-]{1,}",
        text.lower(),
    )

    return [
        word
        for word in words
        if word not in STOPWORDS and len(word) > 2
    ]


# ---------------------------------------------------------
# Keyword extraction
# ---------------------------------------------------------

def keywords(text: str, limit: int = 10) -> list[str]:
    counts = Counter(tokenize(text))

    return [
        word
        for word, _ in counts.most_common(limit)
    ]


# ---------------------------------------------------------
# Slug creation
# ---------------------------------------------------------

def slugify(text: str, prefix: str = "id") -> str:
    text = text.lower()

    text = re.sub(
        r"[^a-z0-9]+",
        "-",
        text,
    ).strip("-")[:70]

    if not text:
        text = hashlib.sha1(
            prefix.encode()
        ).hexdigest()[:8]

    return f"{prefix}-{text}"


# ---------------------------------------------------------
# Sentence splitting helper
# ---------------------------------------------------------

def _split_sentences(text: str) -> list[str]:
    """
    Split a long paragraph into sentences without destroying them.
    """

    if not text:
        return []

    sentences = re.split(
        r"(?<=[.!?])\s+",
        text.strip(),
    )

    return [
        sentence.strip()
        for sentence in sentences
        if sentence.strip()
    ]


# ---------------------------------------------------------
# Long paragraph splitting
# ---------------------------------------------------------

def _split_long_paragraph(
    paragraph: str,
    chunk_size: int,
) -> list[str]:
    """
    Split paragraphs longer than chunk_size at sentence boundaries.

    This avoids arbitrary character cutting whenever possible.
    """

    paragraph = paragraph.strip()

    if not paragraph:
        return []

    if len(paragraph) <= chunk_size:
        return [paragraph]

    sentences = _split_sentences(paragraph)

    # If sentence detection fails, use controlled word-based splitting.
    if len(sentences) <= 1:
        words = paragraph.split()

        pieces = []
        current = ""

        for word in words:
            candidate = (
                f"{current} {word}".strip()
                if current
                else word
            )

            if len(candidate) <= chunk_size:
                current = candidate

            else:
                if current:
                    pieces.append(current)

                current = word

        if current:
            pieces.append(current)

        return pieces

    pieces = []
    current = ""

    for sentence in sentences:
        candidate = (
            f"{current} {sentence}".strip()
            if current
            else sentence
        )

        if len(candidate) <= chunk_size:
            current = candidate

        else:
            if current:
                pieces.append(current)

            # Extremely long single sentence fallback
            if len(sentence) > chunk_size:
                words = sentence.split()
                temp = ""

                for word in words:
                    temp_candidate = (
                        f"{temp} {word}".strip()
                        if temp
                        else word
                    )

                    if len(temp_candidate) <= chunk_size:
                        temp = temp_candidate

                    else:
                        if temp:
                            pieces.append(temp)

                        temp = word

                current = temp

            else:
                current = sentence

    if current:
        pieces.append(current)

    return pieces


# ---------------------------------------------------------
# Paragraph overlap
# ---------------------------------------------------------

def _make_overlap(
    previous_chunk: str,
    overlap_size: int,
) -> str:
    """
    Create overlap from complete trailing sentences instead
    of blindly cutting characters from the previous chunk.
    """

    if not previous_chunk or overlap_size <= 0:
        return ""

    sentences = _split_sentences(previous_chunk)

    selected = []
    length = 0

    for sentence in reversed(sentences):

        if length + len(sentence) > overlap_size and selected:
            break

        selected.append(sentence)

        length += len(sentence) + 1

        if length >= overlap_size:
            break

    selected.reverse()

    overlap = " ".join(selected).strip()

    # Prevent unusually large overlap
    if len(overlap) > overlap_size * 2:
        overlap = overlap[-overlap_size:]

    return overlap


# ---------------------------------------------------------
# Main chunking function
# ---------------------------------------------------------

def chunk_text(
    text: str,
    chunk_size: int = 450,
    chunk_overlap: int = 80,
) -> list[str]:
    """
    Convert cleaned textbook text into meaningful RAG chunks.

    Strategy:
    1. Preserve paragraph boundaries.
    2. Avoid cutting paragraphs in the middle.
    3. Split very long paragraphs at sentence boundaries.
    4. Add a small meaningful overlap.
    5. Remove duplicate chunks.
    """

    text = clean_text(text)

    if not text:
        return []

    # Primary paragraph splitting
    paragraphs = [
        paragraph.strip()
        for paragraph in re.split(
            r"\n\s*\n",
            text,
        )
        if paragraph.strip()
    ]

    # Some PDFs have nearly no blank lines.
    # In that case, retain non-empty lines as fallback paragraphs.
    if len(paragraphs) <= 1:
        lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip()
        ]

        if len(lines) > 1:
            paragraphs = lines

    chunks: list[str] = []
    current_parts: list[str] = []

    def current_text() -> str:
        return "\n\n".join(current_parts).strip()

    for paragraph in paragraphs:

        # Break abnormally large paragraphs intelligently
        pieces = _split_long_paragraph(
            paragraph,
            chunk_size,
        )

        for piece in pieces:

            piece = piece.strip()

            if not piece:
                continue

            existing = current_text()

            candidate = (
                f"{existing}\n\n{piece}".strip()
                if existing
                else piece
            )

            # Fits in existing chunk
            if len(candidate) <= chunk_size:
                current_parts.append(piece)
                continue

            # Current chunk is ready
            if existing:
                chunks.append(existing)

            # Get a meaningful overlap from previous chunk
            overlap_text = _make_overlap(
                existing,
                chunk_overlap,
            )

            current_parts = []

            if overlap_text:
                overlap_candidate = (
                    f"{overlap_text}\n\n{piece}".strip()
                )

                # Only keep overlap if it doesn't make
                # the new chunk too large.
                if len(overlap_candidate) <= chunk_size:
                    current_parts = [
                        overlap_text,
                        piece,
                    ]

                else:
                    current_parts = [piece]

            else:
                current_parts = [piece]

    # Append final chunk
    final_chunk = current_text()

    if final_chunk:
        chunks.append(final_chunk)

    # ---------------------------------------------------------
    # Deduplicate chunks
    # ---------------------------------------------------------

    unique_chunks = []
    seen = set()

    for chunk in chunks:

        normalized = re.sub(
            r"\s+",
            " ",
            chunk.lower(),
        ).strip()

        if not normalized:
            continue

        fingerprint = hashlib.sha1(
            normalized.encode(
                "utf-8",
                errors="ignore",
            )
        ).hexdigest()

        if fingerprint in seen:
            continue

        seen.add(fingerprint)

        unique_chunks.append(
            chunk.strip()
        )

    return unique_chunks


# ---------------------------------------------------------
# Query/text keyword overlap score
# ---------------------------------------------------------

def overlap_score(
    query: str,
    text: str,
) -> float:
    """
    Simple lexical relevance score.

    1.0 means all important query words occur in the text.
    """

    q = set(tokenize(query))
    t = set(tokenize(text))

    if not q or not t:
        return 0.0

    return len(q & t) / len(q)


# ---------------------------------------------------------
# Sentence summary
# ---------------------------------------------------------

def sentence_summary(
    context: str,
    query: str = "",
    max_sentences: int = 5,
) -> str:
    """
    Extract the most query-relevant sentences from supplied context.

    Keep this only as a utility/fallback.
    Do NOT use this to convert Qwen's thinking field into an answer.
    """

    if not context:
        return ""

    sentences = [
        sentence.strip()
        for sentence in re.split(
            r"(?<=[.!?])\s+",
            context,
        )
        if len(sentence.strip()) > 25
    ]

    if not sentences:
        return context[:800].strip()

    scored = [
        (
            overlap_score(
                query,
                sentence,
            ),
            index,
            sentence,
        )
        for index, sentence in enumerate(sentences)
    ]

    scored.sort(
        key=lambda item: (
            item[0],
            -item[1],
        ),
        reverse=True,
    )

    chosen = sorted(
        scored[:max_sentences],
        key=lambda item: item[1],
    )

    return " ".join(
        sentence
        for _, _, sentence in chosen
    )


# ---------------------------------------------------------
# Formula extraction
# ---------------------------------------------------------

def extract_formula(text: str) -> str:
    """
    Extract a simple physics formula from text.
    """

    if not text:
        return ""

    candidates = re.findall(
        r"""
        (?:
            [A-Zα-ω][A-Za-z0-9_]*\s*=\s*[^\n.;]{3,80}
            |
            F\s*=\s*[^\n.;]{3,80}
            |
            V\s*=\s*[^\n.;]{3,80}
            |
            E\s*=\s*[^\n.;]{3,80}
        )
        """,
        text,
        flags=re.VERBOSE,
    )

    return (
        candidates[0].strip()
        if candidates
        else ""
    )


# ---------------------------------------------------------
# Infer chapter from filename
# ---------------------------------------------------------

def filename_to_chapter(
    filename: str,
) -> tuple[str, str]:

    name = re.sub(
        r"\.pdf$",
        "",
        filename,
        flags=re.I,
    )

    name = re.sub(
        r"[_-]+",
        " ",
        name,
    ).strip()

    match = re.search(
        r"(?:chapter|ch)\s*(\d+)\s*(.*)",
        name,
        flags=re.I,
    )

    if match:
        number = int(
            match.group(1)
        )

        extra = (
            match.group(2)
            or ""
        ).strip()

        title = (
            f"Chapter {number} {extra}"
        ).strip()

        return (
            slugify(
                title,
                "ch",
            ),
            title,
        )

    if len(name) > 3:
        title = name.title()

        return (
            slugify(
                title,
                "ch",
            ),
            title,
        )

    return (
        "ch-uploaded-physics",
        "Uploaded Physics PDF",
    )


# ---------------------------------------------------------
# Heading detection
# ---------------------------------------------------------

def is_heading(line: str) -> bool:
    """
    Identify textbook section headings such as:

    14.1 Introduction
    14.2 Classification of Semiconductors
    CHAPTER 14
    """

    if not line:
        return False

    line = re.sub(
        r"\s+",
        " ",
        line.strip(),
    )

    if len(line) < 3 or len(line) > 100:
        return False

    lower = line.lower()

    # Avoid incorrectly treating common textbook labels as topics
    bad_terms = [
        "figure",
        "fig.",
        "example",
        "solution",
        "exercise",
        "copyright",
        "ncert",
        "reprint",
    ]

    if any(
        term in lower
        for term in bad_terms
    ):
        return False

    # CHAPTER 14 / UNIT 3
    if re.match(
        r"^(chapter|unit)\s+\d+",
        line,
        re.I,
    ):
        return True

    # 14.1 INTRODUCTION
    # 14.2 Classification
    # 3.4.2 Something
    if re.match(
        r"^\d+(?:\.\d+)+\s+[A-Za-z][A-Za-z0-9 ,:;()\-–—/]+$",
        line,
    ):
        return True

    words = line.split()

    if not words:
        return False

    # Avoid complete sentences
    if line.endswith(
        (".", "?", "!")
    ):
        return False

    alpha_words = [
        word
        for word in words
        if word[:1].isalpha()
    ]

    if len(alpha_words) < 2:
        return False

    titleish = sum(
        1
        for word in alpha_words
        if (
            word[:1].isupper()
            or word.isupper()
        )
    )

    ratio = (
        titleish
        / max(
            1,
            len(alpha_words),
        )
    )

    return (
        ratio >= 0.65
        and len(words) <= 10
    )


# ---------------------------------------------------------
# Detect heading near top of page
# ---------------------------------------------------------

def detect_page_heading(
    text: str,
) -> str | None:

    if not text:
        return None

    lines = [
        re.sub(
            r"\s+",
            " ",
            line.strip(),
        )
        for line in text.splitlines()
        if line.strip()
    ]

    for line in lines[:35]:

        if is_heading(line):
            return line

    return None


# ---------------------------------------------------------
# Detect chapter from extracted page
# ---------------------------------------------------------

def detect_chapter_from_page(
    text: str,
) -> tuple[str, str] | None:

    if not text:
        return None

    lines = [
        re.sub(
            r"\s+",
            " ",
            line.strip(),
        )
        for line in text.splitlines()
        if line.strip()
    ]

    for index, line in enumerate(
        lines[:45]
    ):

        match = re.match(
            r"^(?:chapter)\s+(\d+)(?:\s*[:-]?\s*(.*))?$",
            line,
            re.I,
        )

        if not match:
            continue

        chapter_number = int(
            match.group(1)
        )

        extra = (
            match.group(2)
            or ""
        ).strip()

        # Often NCERT has:
        #
        # CHAPTER 14
        # Semiconductor Electronics
        #
        # so use the next line as chapter title.
        if (
            not extra
            and index + 1 < len(lines)
        ):
            next_line = lines[
                index + 1
            ]

            if (
                3
                <= len(next_line)
                <= 100
            ):
                extra = next_line

        title = (
            f"Chapter {chapter_number} {extra}"
        ).strip()

        return (
            slugify(
                title,
                "ch",
            ),
            title,
        )

    return None