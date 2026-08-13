import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any
from app.core.config import settings


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180_000)
    return f"pbkdf2_sha256${_b64(salt)}${_b64(digest)}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algo, salt_b64, digest_b64 = stored_hash.split("$", 2)
        if algo != "pbkdf2_sha256":
            return False
        salt = _unb64(salt_b64)
        expected = _unb64(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 180_000)
        return hmac.compare_digest(expected, actual)
    except Exception:
        return False


def create_token(payload: dict[str, Any], expires_in_seconds: int | None = None) -> str:
    if expires_in_seconds is None:
        expires_in_seconds = 60 * 60 * 24 * settings.access_token_days
    token_payload = {**payload, "exp": int(time.time()) + expires_in_seconds}
    body = _b64(json.dumps(token_payload, separators=(",", ":")).encode())
    sig = hmac.new(settings.auth_secret.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(sig)}"


def verify_token(token: str) -> dict[str, Any] | None:
    try:
        body, sig = token.split(".", 1)
        expected = hmac.new(settings.auth_secret.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_unb64(sig), expected):
            return None
        payload = json.loads(_unb64(body))
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def create_email_token(user_id: str, email: str, expires_in_seconds: int = 60 * 60 * 24) -> str:
    return create_token({"kind": "email_verify", "user_id": user_id, "email": email}, expires_in_seconds)
