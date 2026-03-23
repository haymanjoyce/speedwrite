from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import get_current_user
from storage import list_documents

router = APIRouter()


class SearchRequest(BaseModel):
    query: str


def _excerpt(content: str, query: str, context_chars: int = 100) -> str:
    """Extract ~200 chars around the first case-insensitive match."""
    lower = content.lower()
    idx = lower.find(query.lower())
    if idx == -1:
        return content[:200]
    start = max(0, idx - context_chars)
    end = min(len(content), idx + len(query) + context_chars)
    excerpt = content[start:end]
    if start > 0:
        excerpt = '…' + excerpt
    if end < len(content):
        excerpt += '…'
    return excerpt


@router.post("/search")
def search(data: SearchRequest, user=Depends(get_current_user)):
    query = data.query.strip()
    if len(query) < 2:
        return {"documents": [], "evidence": [], "chat": []}

    lower_query = query.lower()
    doc_results = []
    evidence_results = []
    chat_results = []

    for doc in list_documents(user["id"]):
        doc_id = doc.get("id", "")
        doc_title = doc.get("title", "") or ""
        content = doc.get("content", "") or ""

        # Document results — title takes priority; one result per document
        if len(doc_results) < 5:
            if lower_query in doc_title.lower():
                doc_results.append({
                    "id": doc_id,
                    "title": doc_title,
                    "match_type": "title",
                    "excerpt": doc_title,
                })
            elif lower_query in content.lower():
                doc_results.append({
                    "id": doc_id,
                    "title": doc_title,
                    "match_type": "content",
                    "excerpt": _excerpt(content, query),
                })

        # Evidence results
        for ev in doc.get("evidence", []):
            if len(evidence_results) >= 5:
                break
            ev_title = ev.get("title", "") or ""
            ev_content = ev.get("content", "") or ""
            if lower_query in ev_title.lower():
                evidence_results.append({
                    "doc_id": doc_id,
                    "doc_title": doc_title,
                    "evidence_id": ev.get("id", ""),
                    "evidence_title": ev_title,
                    "match_type": "title",
                    "excerpt": ev_title,
                })
            elif lower_query in ev_content.lower():
                evidence_results.append({
                    "doc_id": doc_id,
                    "doc_title": doc_title,
                    "evidence_id": ev.get("id", ""),
                    "evidence_title": ev_title,
                    "match_type": "content",
                    "excerpt": _excerpt(ev_content, query),
                })

        # Chat history results
        for msg in doc.get("chat_history", []):
            if len(chat_results) >= 5:
                break
            msg_content = msg.get("content", "") or ""
            if lower_query in msg_content.lower():
                chat_results.append({
                    "doc_id": doc_id,
                    "doc_title": doc_title,
                    "message": _excerpt(msg_content, query),
                    "role": msg.get("role", "user"),
                })

    return {
        "documents": doc_results,
        "evidence": evidence_results,
        "chat": chat_results,
    }
