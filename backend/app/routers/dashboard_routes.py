import json
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.dependencies import admin_user, current_user
from app.database.db import get_conn

router = APIRouter(prefix="", tags=["dashboard"])


def _load_result(row) -> dict:
    try:
        return json.loads(row["result_json"] or "{}")
    except Exception:
        return {}


def _avg(vals: list[float]) -> float:
    return round(sum(vals) / len(vals), 1) if vals else 0


def _student_performance(student_id: str | None = None) -> dict[str, Any]:
    params = []
    where = "WHERE 1=1"
    if student_id:
        where += " AND er.student_id=?"; params.append(student_id)
    with get_conn() as conn:
        rows = conn.execute(
            f"""
            SELECT er.*, q.text AS question_text, q.marks, q.bloom_level, q.topic_id, q.chapter_id, q.mapped_topic,
                   q.question_type, u.name AS student_name, u.email AS student_email
            FROM evaluation_results er
            LEFT JOIN questions q ON q.id=er.question_id
            LEFT JOIN users u ON u.id=er.student_id
            {where}
            ORDER BY er.created_at DESC
            """,
            params,
        ).fetchall()
    total_marks = 0.0
    max_marks = 0.0
    percentages: list[float] = []
    topic_scores = defaultdict(list)
    bloom_scores = defaultdict(list)
    marks_scores = defaultdict(list)
    weak_counter = defaultdict(int)
    recent = []
    for row in rows:
        result = _load_result(row)
        obtained = float(result.get("marksObtained", result.get("score", 0)) or 0)
        maximum = float(result.get("maxMarks", row["marks"] or 0) or 0)
        percent = float(result.get("percentage", round((obtained / maximum) * 100, 1) if maximum else 0) or 0)
        total_marks += obtained
        max_marks += maximum
        percentages.append(percent)
        topic = row["mapped_topic"] or row["topic_id"] or "Unmapped Topic"
        topic_scores[topic].append(percent)
        bloom_scores[row["bloom_level"] or "Remembering"].append(percent)
        marks_scores[f"{row['marks'] or result.get('maxMarks', 0)}M"].append(percent)
        for weak in result.get("weakAreas") or []:
            weak_counter[str(weak)] += 1
        recent.append({
            "questionId": row["question_id"],
            "question": (row["question_text"] or "Question")[:140],
            "topic": topic,
            "marksObtained": obtained,
            "maxMarks": maximum,
            "percentage": percent,
            "feedback": result.get("feedback", ""),
            "submittedAt": row["created_at"],
            "studentName": row["student_name"],
            "studentEmail": row["student_email"],
        })
    topic_perf = [{"topic": k, "score": _avg(v), "attempts": len(v)} for k, v in topic_scores.items()]
    topic_perf.sort(key=lambda x: x["score"])
    bloom_perf = [{"level": k, "score": _avg(v), "attempts": len(v)} for k, v in bloom_scores.items()]
    marks_perf = [{"marks": k, "score": _avg(v), "attempts": len(v)} for k, v in marks_scores.items()]
    return {
        "totalQuestionsAttempted": len(rows),
        "totalMarksScored": round(total_marks, 1),
        "totalMaxMarks": round(max_marks, 1),
        "averagePercentage": _avg(percentages),
        "topicWiseScore": topic_perf,
        "bloomLevelPerformance": bloom_perf,
        "marksWisePerformance": marks_perf,
        "recentSubmissions": recent[:10],
        "weakTopics": topic_perf[:5],
        "strengthTopics": sorted(topic_perf, key=lambda x: x["score"], reverse=True)[:5],
        "weakAreas": [{"area": k, "count": v} for k, v in sorted(weak_counter.items(), key=lambda x: x[1], reverse=True)[:8]],
    }


def _system_stats() -> dict:
    with get_conn() as conn:
        files = conn.execute("SELECT COUNT(*) c FROM uploads").fetchone()["c"]
        ready_files = conn.execute("SELECT COUNT(*) c FROM uploads WHERE status='Ready'").fetchone()["c"]
        chunks = conn.execute("SELECT COUNT(*) c FROM rag_chunks").fetchone()["c"]
        questions = conn.execute("SELECT COUNT(*) c FROM questions").fetchone()["c"]
        videos = conn.execute("SELECT COUNT(*) c FROM videos").fetchone()["c"]
        students = conn.execute("SELECT COUNT(*) c FROM users WHERE role='student'").fetchone()["c"]
        chapters = conn.execute("SELECT COUNT(DISTINCT chapter_id) c FROM rag_chunks").fetchone()["c"]
        topics = conn.execute("SELECT COUNT(DISTINCT topic_id) c FROM rag_chunks").fetchone()["c"]
    return {
        "totalStudents": students,
        "uploadedPdfs": files,
        "readyPdfs": ready_files,
        "processedChapters": chapters,
        "processedTopics": topics,
        "vectorChunks": chunks,
        "generatedQuestions": questions,
        "generatedVideos": videos,
        "systemModulesOnline": 7,
        "systemHealth": {"cpu": 0, "memory": 0, "storage": 0, "slmTemp": 0},
    }


@router.get("/student/dashboard")
def student_dashboard(user: dict = Depends(current_user)):
    if user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    perf = _student_performance(user.get("id"))
    with get_conn() as conn:
        chapters = conn.execute("SELECT COUNT(DISTINCT chapter_id) c FROM rag_chunks").fetchone()["c"]
        topics = conn.execute("SELECT COUNT(DISTINCT topic_id) c FROM rag_chunks").fetchone()["c"]
        questions = conn.execute("SELECT COUNT(*) c FROM questions").fetchone()["c"]
    return {
        **perf,
        "overallCompletion": perf["averagePercentage"],
        "masteryScore": perf["averagePercentage"],
        "timeSpentThisWeek": "Tracked after practice submissions",
        "testsCompleted": perf["totalQuestionsAttempted"],
        "weakTopicsCount": len(perf["weakTopics"]),
        "chaptersAvailable": chapters,
        "topicsAvailable": topics,
        "questionsAvailable": questions,
        "nextRecommendation": "Select one topic, watch its video, then attempt 1M + descriptive questions.",
    }


@router.get("/admin/dashboard")
def admin_dashboard(user: dict = Depends(admin_user)):
    stats = _system_stats()
    class_perf = _student_performance(None)
    return {
        **stats,
        "avgStudentScore": class_perf["averagePercentage"],
        "weakTopicsCount": len(class_perf["weakTopics"]),
        "classPerformance": class_perf,
    }


@router.get("/admin/students")
def admin_students(user: dict = Depends(admin_user)):
    with get_conn() as conn:
        students = conn.execute("SELECT id,name,email,created_at,last_login_at FROM users WHERE role='student' ORDER BY created_at DESC").fetchall()
    out = []
    for s in students:
        perf = _student_performance(s["id"])
        out.append({
            "id": s["id"],
            "name": s["name"],
            "email": s["email"],
            "createdAt": s["created_at"],
            "lastLoginAt": s["last_login_at"],
            "totalAttempted": perf["totalQuestionsAttempted"],
            "averageScore": perf["averagePercentage"],
            "totalMarksScored": perf["totalMarksScored"],
            "weakTopics": perf["weakTopics"],
        })
    return out


@router.get("/admin/students/{student_id}/performance")
def admin_student_detail(student_id: str, user: dict = Depends(admin_user)):
    with get_conn() as conn:
        row = conn.execute("SELECT id,name,email,created_at,last_login_at FROM users WHERE id=? AND role='student'", (student_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"student": dict(row), "performance": _student_performance(student_id)}


# Backward-compatible dashboard routes.
@router.get("/dashboard/admin")
def admin_stats(user: dict = Depends(admin_user)):
    return admin_dashboard(user)


@router.get("/dashboard/student")
def student_stats(user: dict = Depends(current_user)):
    return student_dashboard(user)


@router.get("/dashboard/modules")
def modules(user: dict = Depends(admin_user)):
    return [
        {"id": "mod-1", "name": "PyMuPDF PDF Extractor", "type": "Ingestion", "status": "Online", "version": "v1", "latency": "local", "utilization": "low", "description": "Extracts selectable PDF text page-wise."},
        {"id": "mod-2", "name": "Chapter / Topic Structurer", "type": "Ingestion", "status": "Online", "version": "v2", "latency": "fast", "utilization": "low", "description": "Builds chapter, topic and subtopic hierarchy from uploaded PDFs."},
        {"id": "mod-3", "name": f"{settings.embedding_provider} embedding store", "type": "RAG Pipeline", "status": "Online", "version": "local", "latency": "local", "utilization": "low", "description": "Stores uploaded PDF chunks as embeddings. Recommended: Ollama nomic-embed-text; fallback: SentenceTransformer/TF-IDF."},
        {"id": "mod-4", "name": "SQLite Knowledge Store", "type": "Storage", "status": "Online", "version": "v5", "latency": "fast", "utilization": "low", "description": "Stores users, PDFs, chunks, manual questions, videos and evaluations."},
        {"id": "mod-5", "name": f"{settings.ollama_model} via Ollama", "type": "SLM / Optional", "status": "Enabled" if settings.use_ollama else "Optional", "version": "local", "latency": "depends CPU", "utilization": "low-medium", "description": "Used for RAG and descriptive answer feedback when available."},
        {"id": "mod-6", "name": "Hybrid Evaluation Engine", "type": "Evaluation", "status": "Online", "version": "v2", "latency": "fast", "utilization": "low", "description": "Scores MCQ and descriptive answers using rubric, similarity and keywords."},
        {"id": "mod-7", "name": "Topic Video Manager", "type": "Learning Content", "status": "Online", "version": "v2", "latency": "fast", "utilization": "low", "description": "Maps uploaded videos or YouTube links to detected topics."},
    ]
