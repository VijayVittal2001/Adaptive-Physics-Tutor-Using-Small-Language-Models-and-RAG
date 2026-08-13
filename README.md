# RAGTutor - Offline RAG AI Physics Tutor Platform

An intelligent, local-first Physics tutoring platform that leverages Retrieval-Augmented Generation (RAG) to provide an interactive learning experience. The system is split into an Admin pipeline for content management and a Student workspace for learning, practice, and doubt solving.

---

## 📁 Directory & File Structure

Here is a complete overview of the folders and files in the project:

```text
RAGTutor/
├── backend/                        # Python FastAPI Backend
│   ├── app/                        # Main Application Code
│   │   ├── core/                   # Configuration and Security Dependencies
│   │   │   ├── config.py           # App settings, default RAG chunk size, Ollama model configs
│   │   │   └── security.py         # Password hashing, JWT token generation/validation
│   │   ├── database/               # Relational Database Context
│   │   │   └── db.py               # SQLite database init, tables creation, WAL mode configuration
│   │   ├── routers/                # FastAPI endpoint route controllers
│   │   │   ├── auth_routes.py      # Student & Admin registration and login endpoints
│   │   │   ├── evaluation_routes.py# Student answers submission & AI grading routes
│   │   │   ├── pdf_routes.py       # PDF file upload and parsing triggers
│   │   │   ├── question_routes.py  # Manual question bank management routes
│   │   │   └── rag_routes.py       # Student RAG doubt solver endpoint (/rag/ask)
│   │   ├── services/               # Core business and AI logic wrappers
│   │   │   ├── evaluation_service.py# descriptive question grading logic
│   │   │   ├── pdf_service.py      # Extracting chapter text, headings, and structuring documents
│   │   │   ├── rag_service.py      # Query retrieval context formatting
│   │   │   ├── slm_service.py      # Local Ollama Qwen chat querying and cleaning
│   │   │   └── vector_service.py   # ChromaDB client, document embeddings and search logic
│   │   ├── utils/                  # Helper utilities
│   │   │   └── text_utils.py       # Text cleaning, paragraphs chunking, and sentence summaries
│   │   └── main.py                 # FastAPI app entry point and CORS middlewares
│   ├── storage/                    # Persistent storage folder (automatically generated)
│   │   ├── sqlite/                 # Contains SQLite relational DB file (physics_tutor.db)
│   │   └── vector_index/           # ChromaDB index database files
│   ├── requirements.txt            # Python environment packages listing (FastAPI, PyMuPDF, ChromaDB)
│   └── run.py                      # Backend development server startup script (port 8000)
│
├── frontend/                       # React (Vite) Frontend
│   ├── src/                        # React source code
│   │   ├── components/             # Reusable UI Components
│   │   │   ├── student/            # Student UI components
│   │   │   │   ├── AnswerEditor.jsx# Descriptive answer textarea with Web Speech API voice typing
│   │   │   │   └── RAGChatBox.jsx  # Student Local RAG doubt solving interface box
│   │   │   └── admin/              # Admin stats, dashboards, and tables components
│   │   ├── context/                # Global React states (e.g. AuthContext)
│   │   ├── layouts/                # Admin/Student sidebar and shell layouts
│   │   ├── pages/                  # Main views/pages
│   │   │   ├── student/            # Student pages
│   │   │   │   ├── PdfKnowledgeViewer.jsx # Live textbook view and RAG Solver panel
│   │   │   │   └── PracticeTest.jsx# Practice center for MCQ and descriptive test solving
│   │   │   └── admin/              # Admin pages
│   │   │       ├── ContentManagement.jsx # PDF uploads and ingestion pipeline status logs
│   │   │       └── AdminDashboard.jsx # Admin metrics dashboard
│   │   ├── services/               # API endpoint fetch integrations
│   │   │   ├── api.js              # Centralized fetch client wrapper (JWT authorization)
│   │   │   └── ragService.js       # Calls backend /rag/ask doubt solver endpoint
│   │   ├── App.jsx                 # App wrapper
│   │   ├── index.css               # Global Tailwind CSS definitions
│   │   └── main.jsx                # React app entry point
│   ├── vite.config.js              # Vite configuration (port 3000, autostart browser)
│   └── package.json                # Frontend package dependencies listing
```

---

## ⚙️ How It Works: System Workflows & Data Flow

The platform relies on a local pipeline combining a relational DB, a vector DB, and a local Large Language Model (LLM).

### 1. Incremental PDF Ingestion (Admin)
- **Upload:** Admins upload NCERT chapters (PDFs) on the Admin dashboard.
- **Parsing:** `PyMuPDF` (configured with `pymupdf` library fallback) extracts selectable text page-by-page.
- **Chapter & Heading Detection:** The system parses text to identify logical chapters and topic headers based on standard physics headings (e.g. `14.1 INTRODUCTION`), rather than simple page breaks.
- **Chunking:** Extracted paragraphs are merged into text chunks matching settings (`chunk_size = 800`, `chunk_overlap = 180`).
- **Incremental Vector Syncing:** Instead of rebuilding the entire database index, the system deletes the old file's chunks and processes/embeds the new chunks using the local `nomic-embed-text` model via Ollama. It stores them in a local ChromaDB collection (`physics_tutor_collection`).

### 2. Student RAG Doubt Solver (Under the Hood)
When a student asks a question in the RAG Chat Box:
1. **Similarity Search:** The question is converted to an embedding using Ollama and queried against ChromaDB to retrieve the **top 3** most relevant textbook chunks in the active chapter.
2. **Context Formatting:** The retrieved chunks are cleaned (stripping metadata headers like `Chapter:` or `Topic:`) and formatted into a structured prompt containing the student's question and raw source text.
3. **Local LLM Response:** The prompt is sent to `qwen3:4b` via Ollama with `num_ctx = 4096` to prevent truncation.
4. **Thinking Model Fallback:** Since Qwen3 is a reasoning model, its thought process is returned in a separate `"thinking"` JSON field. If the model runs out of output tokens or limits during reasoning (leaving `"content"` empty), the system automatically extracts the answer from the `"thinking"` field and sanitizes it using a sentence summarizing regex.
5. **No-Reference Fallback:** If the answer is completely absent from the PDF, the model outputs exactly: `"This exact answer is not found in the uploaded PDF context."` to avoid hallucinations.

### 3. Voice Typing (Student Speech-to-Text)
- Descriptive text boxes in the Board Answer Studio and Practice Center include a **Voice Typing** mic button.
- It leverages the HTML5 **Web Speech API** (`webkitSpeechRecognition`).
- Translates spoken voice to text in real-time, displaying interim words under the editor and automatically appending final sentences directly into the answer textbox.

### 4. Practice Test Grading & Partial Submissions
- Students can answer descriptive and MCQ questions. Copy-pasting in descriptive fields is blocked to encourage learning.
- **Partial Submission:** Students can submit the test incomplete. Empty answers are intercepted by the backend: they bypass the slow LLM evaluation to eliminate grading latency, and are saved directly into the SQLite database as `0.0` score with feedback `"Not attempted."`.
- **Database Concurrency:** All SQLite connections run in **Write-Ahead Logging (WAL)** mode with a `30.0` seconds busy timeout, preventing database locks and operational failures.

---

## 🚀 Running the Application Locally

### 1. Prerequisites
Install and run **Ollama** locally, and pull the required models:
```bash
ollama pull qwen3:4b
ollama pull nomic-embed-text
```

### 2. Start the Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
*Backend runs at `http://localhost:8000`.*

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:3000` (auto-opens in browser).*

### 4. Default Login Credentials
* **Admin:** Email `admin@physicsrag.com` | Password `admin123`
* **Student:** Email `student@physicsrag.com` | Password `student123`
