from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from app.core.config import settings
from app.core.dependencies import admin_user
from app.core.security import create_token, create_email_token, hash_password, verify_password, verify_token
from app.database.db import get_conn, new_id, now_iso
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class RegisterIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)

class AdminCreateIn(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=8)

class GoogleIn(BaseModel):
    id_token: str


def _public_user(row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"], "emailVerified": bool(row["email_verified"])}


def _session(user: dict) -> dict:
    return {"user": user, "token": create_token(user)}


@router.post("/login")
def login(data: LoginIn):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email)=?", (data.email.lower(),)).fetchone()
        if row and verify_password(data.password, row["password_hash"]):
            if not row["is_active"]:
                raise HTTPException(status_code=403, detail="Account is disabled")
            if settings.require_email_verification and row["role"] == "student" and not row["email_verified"]:
                raise HTTPException(status_code=403, detail="Verify your email before login. Check backend/storage/email_outbox if SMTP is not configured.")
            conn.execute("UPDATE users SET last_login_at=? WHERE id=?", (now_iso(), row["id"]))
            return _session(_public_user(row))
    raise HTTPException(status_code=401, detail="Invalid email or password")


@router.post("/register")
def register(data: RegisterIn):
    # Public registration is student-only. Admin accounts are created only by an existing admin.
    email = data.email.lower()
    with get_conn() as conn:
        exists = conn.execute("SELECT id FROM users WHERE lower(email)=?", (email,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Email already registered")
        uid = new_id("user")
        email_verified = 0 if settings.require_email_verification else 1
        conn.execute(
            """
            INSERT INTO users(id,name,email,role,password_hash,auth_provider,email_verified,is_active,created_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (uid, data.name.strip(), email, "student", hash_password(data.password), "local", email_verified, 1, now_iso()),
        )
        row = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    user = _public_user(row)
    verification = None
    if settings.require_email_verification:
        token = create_email_token(uid, email)
        verify_url = f"http://localhost:{settings.port}{settings.api_prefix}/auth/verify-email?token={token}"
        verification = send_verification_email(email, data.name, verify_url)
        return {"user": user, "token": None, "requiresVerification": True, "verification": verification}
    return _session(user)


@router.post("/admin/create")
def create_admin(data: AdminCreateIn, creator: dict = Depends(admin_user)):
    email = data.email.lower()
    with get_conn() as conn:
        exists = conn.execute("SELECT id FROM users WHERE lower(email)=?", (email,)).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Email already registered")
        uid = new_id("user")
        conn.execute(
            """
            INSERT INTO users(id,name,email,role,password_hash,auth_provider,email_verified,is_active,created_by,created_at)
            VALUES(?,?,?,?,?,?,?,?,?,?)
            """,
            (uid, data.name.strip(), email, "admin", hash_password(data.password), "local", 1, 1, creator.get("id"), now_iso()),
        )
        row = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    return {"user": _public_user(row)}


@router.get("/verify-email")
def verify_email(token: str):
    payload = verify_token(token)
    if not payload or payload.get("kind") != "email_verify":
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    with get_conn() as conn:
        conn.execute("UPDATE users SET email_verified=1 WHERE id=? AND lower(email)=?", (payload["user_id"], payload["email"].lower()))
    return RedirectResponse(f"{settings.frontend_url}/login?verified=1")


@router.post("/google")
def google_login(data: GoogleIn):
    if not settings.google_client_id:
        raise HTTPException(status_code=400, detail="GOOGLE_CLIENT_ID is not configured in backend .env")
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        info = id_token.verify_oauth2_token(data.id_token, requests.Request(), settings.google_client_id)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Google token verification failed: {exc}")
    email = info.get("email", "").lower()
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=403, detail="Google account email is not verified")
    name = info.get("name") or email.split("@")[0]
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE lower(email)=?", (email,)).fetchone()
        if not row:
            uid = new_id("user")
            conn.execute(
                """
                INSERT INTO users(id,name,email,role,password_hash,auth_provider,email_verified,is_active,created_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (uid, name, email, "student", hash_password(new_id("google")), "google", 1, 1, now_iso()),
            )
            row = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
        conn.execute("UPDATE users SET last_login_at=? WHERE id=?", (now_iso(), row["id"]))
    return _session(_public_user(row))
