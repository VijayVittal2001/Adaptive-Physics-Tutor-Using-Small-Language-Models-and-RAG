# Final RAG Fix: ChromaDB + Ollama Qwen3

This build uses a clean local open-source RAG pipeline:

PDF upload -> text cleaning -> chunking -> Ollama `nomic-embed-text` embeddings -> ChromaDB -> top-k=5 retrieval -> Qwen3:4B final answer.

## Models required

```powershell
ollama pull qwen3:4b
ollama pull nomic-embed-text
ollama list
```

If `ollama serve` says port 11434 is already used, Ollama is already running.

## Backend

```powershell
cd "RAG1_Physics Tutor\backend"
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

## Frontend

```powershell
cd "RAG1_Physics Tutor\frontend"
npm install
npm run dev
```

## RAG settings

- LLM: `qwen3:4b`
- Embedding: `nomic-embed-text`
- Vector DB: ChromaDB
- Chunk size: 800
- Overlap: 150
- Top K: 5
- Student UI: answer only, no raw chunks shown

## Important endpoints

```text
POST /api/pdf/upload
POST /api/pdf/{file_id}/process
POST /api/rag/ask
GET  /api/rag/index/status
POST /api/rag/index/rebuild
POST /api/rag/index/reset
```

## If answer is not good

1. Reset index:
```text
POST /api/rag/index/reset
```
2. Re-process uploaded PDF or rebuild index:
```text
POST /api/rag/index/rebuild
```
3. Ask again from frontend.

The frontend now displays only `answer`, not retrieved chunks.
