import json
import os
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", "/var/speedwrite"))
USERS_FILE = DATA_DIR / "users.json"
DOCS_DIR = DATA_DIR / "documents"
WELCOME_TEMPLATE_PATH = DATA_DIR / "welcome_document.md"


def load_welcome_template() -> str | None:
    if not WELCOME_TEMPLATE_PATH.exists():
        return None
    return WELCOME_TEMPLATE_PATH.read_text(encoding="utf-8")


def save_welcome_template(content: str) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    WELCOME_TEMPLATE_PATH.write_text(content, encoding="utf-8")


def load_users() -> list:
    if not USERS_FILE.exists():
        return []
    return json.loads(USERS_FILE.read_text())


def save_users(users: list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(json.dumps(users, indent=2))


def _doc_path(user_id: str, doc_id: str) -> Path:
    return DOCS_DIR / user_id / f"{doc_id}.json"


def load_document(user_id: str, doc_id: str):
    path = _doc_path(user_id, doc_id)
    if not path.exists():
        return None
    return json.loads(path.read_text())


def save_document(doc: dict) -> None:
    path = _doc_path(doc["user_id"], doc["id"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, indent=2))


def list_documents(user_id: str) -> list:
    user_dir = DOCS_DIR / user_id
    if not user_dir.exists():
        return []
    docs = []
    for f in user_dir.glob("*.json"):
        try:
            docs.append(json.loads(f.read_text()))
        except Exception:
            pass
    return sorted(docs, key=lambda d: d.get("updated_at", ""), reverse=True)


def delete_document(user_id: str, doc_id: str) -> None:
    path = _doc_path(user_id, doc_id)
    if path.exists():
        path.unlink()
