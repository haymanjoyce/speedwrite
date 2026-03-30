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
    display_name: Optional[str] = None
    plan: str = "free"


class ResetPasswordRequest(BaseModel):
    email: str


class ResetPasswordConfirm(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeEmailRequest(BaseModel):
    new_email: str
    password: str


class UpdateProfileRequest(BaseModel):
    display_name: str


class DeleteAccountRequest(BaseModel):
    password: str


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
    description: str = ""
    created_at: str
    updated_at: str
    evidence: list = []
    audit_log: list = []
    shared_with: list = []
    chat_history: list = []
    evidence_chat_history: list = []
    protected_sections: list = []
    history: list = []
    save_count: int = 0
    structure_locked: bool = False
