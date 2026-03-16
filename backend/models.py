from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str


class Token(BaseModel):
    access_token: str
    token_type: str


class DocumentCreate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = ""


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class Document(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    created_at: str
    updated_at: str
    evidence: list = []
    audit_log: list = []
    shared_with: list = []
    chat_history: list = []
