import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from models import Token, UserCreate, UserLogin, UserOut
from storage import load_users, save_users

router = APIRouter(prefix="/auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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


@router.post("/register", response_model=Token)
def register(data: UserCreate):
    users = load_users()
    if any(u["email"] == data.email for u in users):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "hashed_password": hash_password(data.password),
    }
    users.append(user)
    save_users(users)
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
    return UserOut(id=user["id"], email=user["email"])
