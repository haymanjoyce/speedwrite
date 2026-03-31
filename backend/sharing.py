import secrets
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from storage import list_documents, load_document, load_users, save_document

router = APIRouter()


def _find_snapshot_by_token(token: str):
    """Scan all users' documents to find a snapshot by share token.
    Returns (doc, snapshot_entry) or (None, None).
    """
    users = load_users()
    for user in users:
        for doc in list_documents(user["id"]):
            for entry in doc.get("history", []):
                if entry.get("share_token") == token:
                    return doc, entry
    return None, None


@router.post("/documents/{doc_id}/history/{snapshot_id}/share")
def share_snapshot(doc_id: str, snapshot_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for entry in doc.get("history", []):
        if entry["id"] == snapshot_id:
            if not entry.get("share_token"):
                entry["share_token"] = secrets.token_urlsafe(32)
                save_document(doc)
            return {"token": entry["share_token"]}
    raise HTTPException(status_code=404, detail="Snapshot not found")


@router.post("/documents/{doc_id}/history/{snapshot_id}/unshare")
def unshare_snapshot(doc_id: str, snapshot_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for entry in doc.get("history", []):
        if entry["id"] == snapshot_id:
            entry["share_token"] = None
            save_document(doc)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Snapshot not found")


@router.get("/shared/{token}")
def get_shared_version(token: str):
    doc, entry = _find_snapshot_by_token(token)
    if not entry:
        raise HTTPException(status_code=404, detail="Shared version not found")
    return {
        "doc_title": doc.get("title", ""),
        "label": entry.get("label", ""),
        "timestamp": entry.get("timestamp", ""),
        "content": entry.get("content", ""),
        "comments": entry.get("comments", []),
    }


class CommentRequest(BaseModel):
    name: str
    body: str


class OwnerCommentRequest(BaseModel):
    body: str


@router.post("/shared/{token}/comments")
def post_comment(token: str, data: CommentRequest):
    name = data.name.strip()
    body = data.body.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    if len(name) > 100:
        raise HTTPException(status_code=422, detail="Name must be 100 characters or fewer")
    if not body:
        raise HTTPException(status_code=422, detail="Message is required")
    if len(body) > 2000:
        raise HTTPException(status_code=422, detail="Message must be 2000 characters or fewer")

    doc, entry = _find_snapshot_by_token(token)
    if not entry:
        raise HTTPException(status_code=404, detail="Shared version not found")

    comment = {
        "id": str(uuid.uuid4()),
        "name": name,
        "body": body,
        "created_at": datetime.utcnow().isoformat(),
        "is_owner": False,
    }
    if "comments" not in entry:
        entry["comments"] = []
    entry["comments"].append(comment)
    save_document(doc)
    return comment


@router.post("/documents/{doc_id}/history/{snapshot_id}/comments")
def post_owner_comment(
    doc_id: str, snapshot_id: str, data: OwnerCommentRequest, user=Depends(get_current_user)
):
    body = data.body.strip()
    if not body:
        raise HTTPException(status_code=422, detail="Message is required")
    if len(body) > 2000:
        raise HTTPException(status_code=422, detail="Message must be 2000 characters or fewer")

    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    name = user.get("display_name") or user.get("email", "Owner")

    for entry in doc.get("history", []):
        if entry["id"] == snapshot_id:
            comment = {
                "id": str(uuid.uuid4()),
                "name": name,
                "body": body,
                "created_at": datetime.utcnow().isoformat(),
                "is_owner": True,
            }
            if "comments" not in entry:
                entry["comments"] = []
            entry["comments"].append(comment)
            save_document(doc)
            return comment

    raise HTTPException(status_code=404, detail="Snapshot not found")


@router.delete("/documents/{doc_id}/history/{snapshot_id}/comments/{comment_id}")
def delete_comment(
    doc_id: str, snapshot_id: str, comment_id: str, user=Depends(get_current_user)
):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for entry in doc.get("history", []):
        if entry["id"] == snapshot_id:
            comments = entry.get("comments", [])
            new_comments = [c for c in comments if c["id"] != comment_id]
            if len(new_comments) == len(comments):
                raise HTTPException(status_code=404, detail="Comment not found")
            entry["comments"] = new_comments
            save_document(doc)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Snapshot not found")
