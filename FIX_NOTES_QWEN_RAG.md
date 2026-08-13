# Qwen3:4B RAG Fix Notes

This build was patched so the RAG tutor uses both sources of knowledge:

1. Processed NCERT / study PDF chunks from `rag_chunks`
2. Uploaded/admin-created question bank entries with model answers, MCQ options, explanations, rubric and keywords

## Required Ollama models

Run once:

```bash
ollama pull qwen3:4b
ollama pull nomic-embed-text
ollama serve
```

Backend `.env` should contain:

```env
USE_OLLAMA=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
EMBEDDING_PROVIDER=ollama
OLLAMA_EMBED_MODEL=nomic-embed-text
CHUNK_SIZE=700
CHUNK_OVERLAP=180
RETRIEVAL_TOP_K=7
```

## Run backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python run.py
```

Open health check:

```text
http://localhost:8000/api/health
```

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Important endpoints

- `POST /api/pdf/upload` upload PDF
- `POST /api/pdf/{file_id}/process` extract, chunk and embed
- `POST /api/rag/ask` ask from PDF + question bank
- `GET /api/rag/index/status` check vector index
- `POST /api/rag/index/rebuild` rebuild embeddings after any manual DB change

## What was fixed

- Frontend/backend CORS is more tolerant for localhost and local LAN dev URLs.
- Qwen generation is now lower-temperature and stricter for precise answers.
- The RAG embedding index now includes uploaded questions and answers, not only PDF text.
- Question-paper processing rebuilds the vector index after extracting questions.
- Manual create/update/delete question actions rebuild the vector index automatically.
- Added index status/rebuild endpoints for debugging.

If PDF upload shows `Failed to fetch`, first confirm the backend is running on port 8000 and `/api/health` opens in the browser. If processing fails, check the file row pipeline log; scanned image-only PDFs need OCR and selectable-text PDFs process directly with PyMuPDF.
