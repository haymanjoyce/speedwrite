import re
import shutil
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from models import Document, DocumentCreate, DocumentUpdate
from storage import DOCS_DIR, append_audit_log, delete_document, list_documents, load_document, save_document

router = APIRouter(prefix="/documents")


def add_snapshot(doc: dict, trigger: str, label: str) -> None:
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "trigger": trigger,
        "label": label,
        "content": doc.get("content", ""),
    }
    history = doc.setdefault("history", [])
    history.append(entry)
    if len(history) > 50:
        doc["history"] = history[-50:]


def extract_title(content: str) -> str:
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else ""


@router.post("/", response_model=Document)
def create_document(data: DocumentCreate, user=Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    content = data.content or ""
    title = data.title or extract_title(content) or "Untitled"
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": title,
        "content": content,
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
    append_audit_log(doc, "document_created", "Document created")
    save_document(doc)
    return doc


@router.get("/", response_model=list[Document])
def list_user_documents(user=Depends(get_current_user)):
    return list_documents(user["id"])


@router.get("/{doc_id}", response_model=Document)
def get_document(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/{doc_id}", response_model=Document)
def update_document(doc_id: str, data: DocumentUpdate, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if data.content is not None:
        doc["content"] = data.content
        # Re-derive title from H1 unless title was explicitly provided
        if data.title is None:
            derived = extract_title(data.content)
            if derived:
                doc["title"] = derived
    if data.title is not None:
        doc["title"] = data.title
    doc["updated_at"] = datetime.utcnow().isoformat()
    word_count = len(doc["content"].split()) if doc.get("content") else 0
    append_audit_log(doc, "document_edited", f"Document saved ({word_count} words)")
    doc["save_count"] = doc.get("save_count", 0) + 1
    if doc["save_count"] % 10 == 0:
        add_snapshot(doc, "auto", "Auto save")
    save_document(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_doc(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    evidence_dir = DOCS_DIR / user["id"] / "evidence" / doc_id
    if evidence_dir.exists():
        shutil.rmtree(evidence_dir)

    embeddings_file = DOCS_DIR.parent / "embeddings" / user["id"] / f"{doc_id}.json"
    if embeddings_file.exists():
        embeddings_file.unlink()

    delete_document(user["id"], doc_id)


class SnapshotRequest(BaseModel):
    label: str = ""


@router.post("/{doc_id}/snapshot")
def create_snapshot(doc_id: str, data: SnapshotRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    label = data.label.strip() or "Manual checkpoint"
    trigger = "rewrite" if label == "AI rewrite" else "manual"
    add_snapshot(doc, trigger, label)
    save_document(doc)
    return doc["history"][-1]


@router.get("/{doc_id}/history")
def list_history(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    history = doc.get("history", [])
    stripped = [
        {"id": e["id"], "timestamp": e["timestamp"], "trigger": e["trigger"], "label": e["label"]}
        for e in reversed(history)
    ]
    return stripped


@router.get("/{doc_id}/history/{snapshot_id}")
def get_snapshot(doc_id: str, snapshot_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for entry in doc.get("history", []):
        if entry["id"] == snapshot_id:
            return entry
    raise HTTPException(status_code=404, detail="Snapshot not found")


class ProtectRequest(BaseModel):
    heading: str



@router.post("/{doc_id}/protect")
def protect_section(doc_id: str, data: ProtectRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.setdefault("protected_sections", [])
    if data.heading not in doc["protected_sections"]:
        doc["protected_sections"].append(data.heading)
        save_document(doc)
    return doc["protected_sections"]


@router.delete("/{doc_id}/protect")
def unprotect_section(doc_id: str, data: ProtectRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.setdefault("protected_sections", [])
    doc["protected_sections"] = [h for h in doc["protected_sections"] if h != data.heading]
    save_document(doc)
    return doc["protected_sections"]
