import os
import secrets
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from mailer import send_password_reset_email
from models import (
    ByokKeyRequest,
    ChangeEmailRequest,
    ChangePasswordRequest,
    DeleteAccountRequest,
    ResetPasswordConfirm,
    ResetPasswordRequest,
    Token,
    UpdateProfileRequest,
    UserCreate,
    UserLogin,
    UserOut,
)
from storage import DATA_DIR, DOCS_DIR, load_users, save_document, save_users, load_welcome_template

router = APIRouter(prefix="/auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def registrations_open() -> bool:
    """Single source of truth for whether new registrations are accepted.

    Controlled by the REGISTRATIONS_OPEN env var. Truthy (case-insensitive):
    "true", "1", "yes". Anything else, including absence, means closed.
    """
    return os.getenv("REGISTRATIONS_OPEN", "").strip().lower() in ("true", "1", "yes")


def _get_fernet() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY", "")
    if not key:
        raise RuntimeError("ENCRYPTION_KEY environment variable is not set")
    return Fernet(key.encode())


def encrypt_byok_key(api_key: str) -> str:
    return _get_fernet().encrypt(api_key.encode()).decode()


def decrypt_byok_key(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


def get_actions_used(user: dict) -> int:
    """Return current month's action count, resetting if month has changed."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    reset_at_str = user.get("ai_actions_reset_at")
    if reset_at_str:
        reset_at = datetime.fromisoformat(reset_at_str)
        if reset_at.year != now.year or reset_at.month != now.month:
            return 0  # stale — will be reset on next increment
    return user.get("ai_actions_used", 0)


def increment_action_count(user_id: str) -> None:
    """Increment ai_actions_used for the user, resetting if month has changed."""
    from datetime import datetime, timezone
    from storage import load_users, save_users
    now = datetime.now(timezone.utc)
    users = load_users()
    u = next((u for u in users if u["id"] == user_id), None)
    if not u:
        return
    reset_at_str = u.get("ai_actions_reset_at")
    if reset_at_str:
        reset_at = datetime.fromisoformat(reset_at_str)
        if reset_at.year != now.year or reset_at.month != now.month:
            u["ai_actions_used"] = 0
            u["ai_actions_reset_at"] = now.isoformat()
    else:
        u["ai_actions_reset_at"] = now.isoformat()
    u["ai_actions_used"] = u.get("ai_actions_used", 0) + 1
    save_users(users)


def get_byok_key(user: dict) -> str | None:
    encrypted = user.get("byok_key_encrypted")
    if not encrypted:
        return None
    try:
        return decrypt_byok_key(encrypted)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt API key — contact support")
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "changeme-set-a-real-secret-in-env")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7  # 1 week


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM
    )


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    users = load_users()
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("/registration-status")
def registration_status():
    return {"open": registrations_open()}


@router.post("/register", response_model=Token)
def register(data: UserCreate):
    if not registrations_open():
        raise HTTPException(status_code=403, detail="Registrations are closed")
    users = load_users()
    if any(u["email"] == data.email for u in users):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "hashed_password": hash_password(data.password),
        "plan": "free",
    }
    users.append(user)
    save_users(users)
    template = load_welcome_template()
    if template:
        import re, uuid as _uuid
        from datetime import datetime as _dt
        h1 = re.search(r"^#\s+(.+)$", template, re.MULTILINE)
        title = h1.group(1).strip() if h1 else "Getting Started"
        now = _dt.utcnow().isoformat()
        doc = {
            "id": str(_uuid.uuid4()),
            "user_id": user["id"],
            "title": title,
            "content": template,
            "description": "",
            "created_at": now,
            "updated_at": now,
            "evidence": [],
            "audit_log": [],
            "shared_with": [],
            "protected_sections": [],
            "evidence_chat_history": [],
            "history": [],
            "save_count": 0,
        }
        try:
            save_document(doc)
        except Exception:
            pass
    return Token(access_token=create_token(user["id"]), token_type="bearer")


@router.post("/login", response_model=Token)
def login(data: UserLogin):
    users = load_users()
    user = next((u for u in users if u["email"] == data.email), None)
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_token(user["id"]), token_type="bearer")


@router.get("/me", response_model=UserOut)
def me(user=Depends(get_current_user)):
    encrypted = user.get("byok_key_encrypted")
    has_byok = bool(encrypted)
    masked = None
    if encrypted:
        try:
            raw = decrypt_byok_key(encrypted)
            masked = raw[:7] + "••••••••" + raw[-4:] if len(raw) > 11 else "••••••••"
        except Exception:
            masked = "••••••••"
    return UserOut(
        id=user["id"],
        email=user["email"],
        display_name=user.get("display_name"),
        plan=user.get("plan", "free"),
        has_byok_key=has_byok,
        byok_key_masked=masked,
        ai_actions_used=get_actions_used(user),
        ai_actions_reset_at=user.get("ai_actions_reset_at"),
        is_admin=user.get("is_admin", False),
    )


@router.post("/reset-password/request")
def reset_password_request(data: ResetPasswordRequest):
    users = load_users()
    user = next((u for u in users if u["email"] == data.email), None)
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    user["reset_token"] = token
    user["reset_token_expires"] = expires
    save_users(users)
    try:
        send_password_reset_email(data.email, token)
    except Exception as e:
        print(f"SendGrid error: {e}")
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password/confirm")
def reset_password_confirm(data: ResetPasswordConfirm):
    users = load_users()
    user = next((u for u in users if u.get("reset_token") == data.token), None)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    expires_str = user.get("reset_token_expires")
    if not expires_str:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    expires = datetime.fromisoformat(expires_str)
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user["hashed_password"] = hash_password(data.new_password)
    user["reset_token"] = None
    user["reset_token_expires"] = None
    save_users(users)
    return {"message": "Password updated."}


@router.post("/change-password")
def change_password(data: ChangePasswordRequest, user=Depends(get_current_user)):
    if not verify_password(data.current_password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    users = load_users()
    u = next((u for u in users if u["id"] == user["id"]), None)
    u["hashed_password"] = hash_password(data.new_password)
    save_users(users)
    return {"message": "Password updated."}


@router.post("/change-email")
def change_email(data: ChangeEmailRequest, user=Depends(get_current_user)):
    if not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    users = load_users()
    if any(u["email"] == data.new_email and u["id"] != user["id"] for u in users):
        raise HTTPException(status_code=400, detail="Email already in use")
    u = next((u for u in users if u["id"] == user["id"]), None)
    u["email"] = data.new_email
    save_users(users)
    return {"message": "Email updated."}


@router.post("/update-profile")
def update_profile(data: UpdateProfileRequest, user=Depends(get_current_user)):
    users = load_users()
    u = next((u for u in users if u["id"] == user["id"]), None)
    u["display_name"] = data.display_name
    save_users(users)
    return {"message": "Profile updated."}


@router.post("/byok")
def save_byok_key(data: ByokKeyRequest, user=Depends(get_current_user)):
    if not data.api_key.strip():
        raise HTTPException(status_code=400, detail="API key cannot be empty")
    users = load_users()
    u = next((u for u in users if u["id"] == user["id"]), None)
    u["byok_key_encrypted"] = encrypt_byok_key(data.api_key.strip())
    save_users(users)
    return {"message": "API key saved."}


@router.delete("/byok")
def remove_byok_key(user=Depends(get_current_user)):
    users = load_users()
    u = next((u for u in users if u["id"] == user["id"]), None)
    u.pop("byok_key_encrypted", None)
    save_users(users)
    return {"message": "API key removed."}


@router.delete("/account")
def delete_account(data: DeleteAccountRequest, user=Depends(get_current_user)):
    if not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    users = load_users()
    users = [u for u in users if u["id"] != user["id"]]
    save_users(users)
    shutil.rmtree(DOCS_DIR / user["id"], ignore_errors=True)
    shutil.rmtree(DOCS_DIR.parent / "embeddings" / user["id"], ignore_errors=True)
    shutil.rmtree(DATA_DIR / "templates" / user["id"], ignore_errors=True)
    return {"message": "Account deleted."}
