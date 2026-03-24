from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from storage import append_audit_log, load_document, save_document

router = APIRouter(prefix="/documents")


class LogEntryRequest(BaseModel):
    event: str
    summary: str
    metadata: dict = {}


@router.get("/{doc_id}/log")
def get_log(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    log = doc.get("audit_log", [])
    return list(reversed(log))


@router.post("/{doc_id}/log")
def add_log_entry(doc_id: str, data: LogEntryRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    append_audit_log(doc, data.event, data.summary, data.metadata)
    save_document(doc)
    return doc["audit_log"][-1]
