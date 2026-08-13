# PhysTutor AI Backend

FastAPI backend for the Offline-First Physics RAG Tutor.

## What is fixed in this version

- Uploaded PDFs open **inline** in the student PDF viewer instead of downloading.
- Student topic click jumps to the detected PDF page and also shows extracted text preview, so the screen is not blank even if the browser blocks the PDF iframe.
- Knowledge PDFs are processed into chapter → topic → subtopic chunks.
- Local semantic embeddings use `sentence-transformers` by default, with automatic TF-IDF fallback.
- Ollama is enabled by default for local Gemma: `gemma3n:e4b`.
- Admin can upload real topic videos and map each video to a detected topic.
- Student video page plays the uploaded local video for that topic.
- Question paper PDF upload remains separate from knowledge PDF upload.
- SQLite migrations are included for existing local databases.

## Run backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Open: http://localhost:8000/docs

## Ollama local model

Keep Ollama running in a separate terminal:

```bash
ollama serve
```

Pull the local model once:

```bash
ollama pull gemma3n:e4b
```

`.env`:

```env
USE_OLLAMA=true
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3n:e4b
```

If Ollama is not running, the app still answers from retrieved PDF chunks using the local fallback summarizer.

## Local embeddings

Default:

```env
EMBEDDING_PROVIDER=sentence-transformer
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

If `sentence-transformers` or the model is not available, the backend automatically falls back to TF-IDF so the application does not crash.

## Admin login

Default admin is configured in `.env`:

```text
admin@physicsrag.com / admin123
```

Change this before real deployment.

## Correct workflow

1. Start backend.
2. Start frontend.
3. Login as admin.
4. Upload **Knowledge PDF**.
5. Wait until status is **Ready**.
6. Detected topics appear in admin and student screen.
7. Select a detected topic and upload a topic video.
8. Login as student.
9. Open PDF Textbook & RAG.
10. Click any topic: PDF page jumps to that topic page, extracted text preview updates, RAG uses that selected topic, and video opens under the selected topic.
