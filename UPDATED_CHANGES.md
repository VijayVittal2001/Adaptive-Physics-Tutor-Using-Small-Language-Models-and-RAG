# Reworked Fixes – Real Uploaded Content Only

This build removes the hardcoded student dashboard content and improves the real PDF → chunks → embedding → RAG workflow.

## Main fixes

1. **Student dashboard is now dynamic**
   - Core Chapter Browse uses `/api/pdf/chapters` only.
   - No fixed Electrostatics / Current Electricity cards.
   - Study advice is generated from real student performance and uploaded chapters.

2. **PDF topic detection cleaned**
   - Broken title fragments like `AND SIMPLE CIRCUITS` are no longer treated as topics.
   - Topics are created from numbered textbook headings such as `14.1 INTRODUCTION`.
   - Every selectable-text PDF page is stored in `pdf_pages` and every topic chunk is stored in `rag_chunks`.

3. **Real local embedding store**
   - Default embedding provider is now Ollama `nomic-embed-text`.
   - Fallback is SentenceTransformer, then TF-IDF so the app does not crash.
   - Defaults: chunk size `700`, overlap `180`, top-k `7`.

4. **RAG answer improved**
   - Uses qwen3:4b through Ollama by default.
   - Removes Qwen `<think>...</think>` text.
   - Answers are shorter and exam-style.
   - RAG answers only from uploaded PDF chunks.

5. **Practice page improved**
   - Answers are hidden before submission.
   - After submission, the student sees score, feedback, expected/model answer, correct MCQ option, and related video button.
   - Descriptive answer copy-paste is blocked and paste attempts are recorded in telemetry.

6. **Video flow improved**
   - Admin can upload video or paste YouTube link topic-wise.
   - Student can open video after practice submission or from topic page.

7. **Unnecessary pages hidden from sidebar**
   - Offline RAG Store Management, RAG Pipeline Monitor and Hybrid Evaluator are removed from admin sidebar.
   - Question Bank, Video Management, PDF Upload and Analytics remain.

## Required Ollama models

```powershell
ollama pull qwen3:4b
ollama pull nomic-embed-text
```

## Backend `.env`

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
