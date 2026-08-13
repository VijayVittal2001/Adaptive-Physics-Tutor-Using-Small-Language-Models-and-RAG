# Final fixes applied

## RAG / Qwen3:4B
- Backend Ollama prompt now uses `/no_think`.
- Answers are forced to 3-5 short exam-style lines.
- Backend trims long Qwen outputs before sending to frontend.
- Raw page/chapter/chunk metadata is no longer included in the model context shown to students.
- Frontend RAG chat displays the final `answer` and no longer exposes raw source text to the student.

## Embeddings
- PDF chunks are embedded.
- Manually uploaded question-bank questions, model answers, rubrics and keywords are embedded.
- After adding/updating/deleting questions, the RAG index rebuilds automatically.

## Admin Question Bank media
- Admin can optionally upload a question photo/diagram.
- Admin can optionally upload a solution video for the question.
- Both are optional; questions work without them.
- Student practice page shows the diagram before answering.
- Student practice page shows the solution video after submission/evaluation.

## Run commands

Backend:
```powershell
cd backend
python -m uvicorn app.main:app --reload
```

Frontend:
```powershell
cd frontend
npm install
npm run dev
```

Ollama check:
```powershell
ollama list
ollama run qwen3:4b
```

Required models:
```powershell
ollama pull qwen3:4b
ollama pull nomic-embed-text
```
