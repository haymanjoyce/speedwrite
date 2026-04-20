import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from auth import get_actions_used, get_byok_key, get_current_user, increment_action_count
from embeddings import index_evidence_background, remove_evidence_chunks, retrieve_relevant_chunks
from limits import FREE_ACTION_CAP, FREE_EVIDENCE_LIMIT
from llm import complete
from storage import DOCS_DIR, load_document, save_document

router = APIRouter(prefix="/documents")

ALLOWED_EXTENSIONS = {".txt", ".md", ".pdf", ".docx"}


def _evidence_file_dir(user_id: str, doc_id: str) -> Path:
    return DOCS_DIR / user_id / "evidence" / doc_id


# --- Text extraction helpers ---

def _extract_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


def _extract_pdf(data: bytes) -> str:
    import io
    from pypdf import PdfReader
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(data: bytes) -> str:
    import io
    from docx import Document as DocxDocument
    doc = DocxDocument(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)


def _fetch_url(url: str) -> tuple[str, str]:
    """Returns (title, text_content)."""
    from urllib.parse import urlparse
    from bs4 import BeautifulSoup

    resp = httpx.get(
        url,
        timeout=15,
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (compatible; SpeedWrite/1.0)"},
    )
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    title_tag = soup.find("title")
    title = title_tag.text.strip() if (title_tag and title_tag.text.strip()) else (urlparse(url).hostname or url)

    lines = [line.strip() for line in soup.get_text(separator="\n").splitlines()]
    text = "\n".join(line for line in lines if line)

    return title, text


# --- Pydantic models ---

class EvidenceItem(BaseModel):
    id: str
    type: str
    title: str
    url: Optional[str] = None
    filename: Optional[str] = None
    file_size: Optional[int] = None
    created_at: str
    source_doc_id: Optional[str] = None
    last_fetched_at: Optional[str] = None
    last_fetch_error: Optional[str] = None
    active: Optional[bool] = None


class EvidenceItemFull(EvidenceItem):
    content: str
    description: Optional[str] = None


class AddUrlRequest(BaseModel):
    url: str


class AddTextRequest(BaseModel):
    title: str
    content: str


class AddDocumentRequest(BaseModel):
    source_doc_id: str


class UpdateEvidenceRequest(BaseModel):
    active: Optional[bool] = None


class RagQueryRequest(BaseModel):
    query: str


# --- Endpoints ---

@router.get("/{doc_id}/evidence", response_model=list[EvidenceItem])
def list_evidence(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return [{k: v for k, v in item.items() if k != "content"} for item in doc.get("evidence", [])]


@router.get("/{doc_id}/evidence/{evidence_id}", response_model=EvidenceItemFull)
def get_evidence_item(doc_id: str, evidence_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for item in doc.get("evidence", []):
        if item["id"] == evidence_id:
            return item
    raise HTTPException(status_code=404, detail="Evidence item not found")


@router.post("/{doc_id}/evidence/file", response_model=EvidenceItemFull)
async def add_evidence_file(
    doc_id: str, file: UploadFile = File(...), user=Depends(get_current_user)
):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if len(doc.get("evidence", [])) >= FREE_EVIDENCE_LIMIT:
        raise HTTPException(status_code=400, detail=f"Free plan is limited to {FREE_EVIDENCE_LIMIT} evidence sources per document.")

    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use .txt, .md, .pdf, or .docx")

    data = await file.read()
    file_size = len(data)

    if ext in (".txt", ".md"):
        content = _extract_txt(data)
    elif ext == ".pdf":
        try:
            content = _extract_pdf(data)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not extract PDF text: {e}")
    else:  # .docx
        try:
            content = _extract_docx(data)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not extract DOCX text: {e}")

    evidence_id = str(uuid.uuid4())
    evidence_dir = _evidence_file_dir(user["id"], doc_id)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    (evidence_dir / f"{evidence_id}_{filename}").write_bytes(data)

    now = datetime.utcnow().isoformat()
    item = {
        "id": evidence_id,
        "type": "file",
        "title": filename,
        "url": None,
        "filename": filename,
        "file_size": file_size,
        "content": content,
        "created_at": now,
    }
    doc.setdefault("evidence", [])
    doc["evidence"].append(item)
    save_document(doc)
    index_evidence_background(user["id"], doc_id, evidence_id, filename, content)
    return item


@router.post("/{doc_id}/evidence/url", response_model=EvidenceItemFull)
def add_evidence_url(doc_id: str, data: AddUrlRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if len(doc.get("evidence", [])) >= FREE_EVIDENCE_LIMIT:
        raise HTTPException(status_code=400, detail=f"Free plan is limited to {FREE_EVIDENCE_LIMIT} evidence sources per document.")

    try:
        title, content = _fetch_url(data.url)
    except httpx.HTTPError as e:
        raise HTTPException(status_code=422, detail=f"Could not fetch URL: {e}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not extract URL content: {e}")

    evidence_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    item = {
        "id": evidence_id,
        "type": "url",
        "title": title,
        "url": data.url,
        "filename": None,
        "file_size": None,
        "content": content,
        "created_at": now,
        "last_fetched_at": now,
        "last_fetch_error": None,
    }
    doc.setdefault("evidence", [])
    doc["evidence"].append(item)
    save_document(doc)
    index_evidence_background(user["id"], doc_id, evidence_id, title, content)
    return item


@router.post("/{doc_id}/evidence/text", response_model=EvidenceItemFull)
def add_evidence_text(doc_id: str, data: AddTextRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if len(doc.get("evidence", [])) >= FREE_EVIDENCE_LIMIT:
        raise HTTPException(status_code=400, detail=f"Free plan is limited to {FREE_EVIDENCE_LIMIT} evidence sources per document.")

    evidence_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    item = {
        "id": evidence_id,
        "type": "text",
        "title": data.title,
        "url": None,
        "filename": None,
        "file_size": None,
        "content": data.content,
        "created_at": now,
    }
    doc.setdefault("evidence", [])
    doc["evidence"].append(item)
    save_document(doc)
    index_evidence_background(user["id"], doc_id, evidence_id, data.title, data.content)
    return item


@router.post("/{doc_id}/evidence/document", response_model=EvidenceItemFull)
def add_evidence_document(doc_id: str, data: AddDocumentRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if len(doc.get("evidence", [])) >= FREE_EVIDENCE_LIMIT:
        raise HTTPException(status_code=400, detail=f"Free plan is limited to {FREE_EVIDENCE_LIMIT} evidence sources per document.")

    source = load_document(user["id"], data.source_doc_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source document not found")

    evidence_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    item = {
        "id": evidence_id,
        "type": "document",
        "title": source.get("title", "Untitled"),
        "source_doc_id": data.source_doc_id,
        "content": source.get("content", ""),
        "url": None,
        "filename": None,
        "file_size": None,
        "created_at": now,
    }
    doc.setdefault("evidence", [])
    doc["evidence"].append(item)
    save_document(doc)
    index_evidence_background(user["id"], doc_id, evidence_id, item["title"], item["content"])
    return item


@router.patch("/{doc_id}/evidence/{evidence_id}", response_model=EvidenceItemFull)
def update_evidence_item(doc_id: str, evidence_id: str, data: UpdateEvidenceRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    items = doc.get("evidence", [])
    item = next((i for i in items if i["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    if data.active is not None:
        item["active"] = data.active
    save_document(doc)
    return item


@router.post("/{doc_id}/evidence/{evidence_id}/rag-query")
def rag_query(doc_id: str, evidence_id: str, data: RagQueryRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    items = doc.get("evidence", [])
    if not any(i["id"] == evidence_id for i in items):
        raise HTTPException(status_code=404, detail="Evidence item not found")
    chunks = retrieve_relevant_chunks(user["id"], doc_id, data.query, k=5, evidence_id=evidence_id)
    if not chunks:
        return {"chunks": [], "used_rag": False}
    return {
        "chunks": [{"text": c["text"], "chunk_index": c["chunk_index"]} for c in chunks],
        "used_rag": True,
    }


@router.post("/{doc_id}/evidence/{evidence_id}/refresh", response_model=EvidenceItemFull)
def refresh_evidence(doc_id: str, evidence_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    items = doc.get("evidence", [])
    item = next((i for i in items if i["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    item_type = item.get("type")

    if item_type == "url":
        try:
            _, content = _fetch_url(item["url"])
            item["content"] = content
            item["last_fetched_at"] = datetime.utcnow().isoformat()
            item["last_fetch_error"] = None
            save_document(doc)
            index_evidence_background(user["id"], doc_id, evidence_id, item["title"], content)
        except httpx.HTTPStatusError as e:
            item["last_fetch_error"] = f"{e.response.status_code} {e.response.reason_phrase}"
            save_document(doc)
        except httpx.TimeoutException:
            item["last_fetch_error"] = "Connection timeout"
            save_document(doc)
        except Exception:
            item["last_fetch_error"] = "Fetch failed"
            save_document(doc)
    elif item_type == "document":
        source = load_document(user["id"], item["source_doc_id"])
        if not source:
            raise HTTPException(status_code=404, detail="Source document not found")
        content = source.get("content", "")
        item["content"] = content
        item["last_fetched_at"] = datetime.utcnow().isoformat()
        save_document(doc)
        index_evidence_background(user["id"], doc_id, evidence_id, item["title"], content)
    else:
        raise HTTPException(status_code=400, detail="Only URL and document sources can be refreshed")

    return item


_DESCRIBE_EVIDENCE_PROMPT = """\
Return ONLY the following markdown structure. No preamble, no title, no additional text outside it. \
Each section must have 3-5 bullet points. Each bullet point must be a single short line — do not wrap \
or write multi-sentence bullets.

## Summary
- ...

## Key themes
- ...

## Key arguments
- ...

## Open questions
- ...\
"""

@router.post("/{doc_id}/evidence/{evidence_id}/describe", response_model=EvidenceItemFull)
def describe_evidence(doc_id: str, evidence_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    items = doc.get("evidence", [])
    item = next((i for i in items if i["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    byok_key = get_byok_key(user)
    if not byok_key:
        actions_used = get_actions_used(user)
        if actions_used >= FREE_ACTION_CAP:
            raise HTTPException(
                status_code=429,
                detail=f"Monthly limit of {FREE_ACTION_CAP} AI actions reached. Add your Anthropic API key in Account settings to continue."
            )

    content = item.get("content", "")
    system = f"You are analysing an evidence source titled \"{item.get('title', 'Untitled')}\".\n\nContent:\n---\n{content}\n---"

    result = complete(
        system=system,
        messages=[{"role": "user", "content": _DESCRIBE_EVIDENCE_PROMPT}],
        max_tokens=1024,
        provider=None,
        byok_key=byok_key,
    )
    increment_action_count(user["id"])

    item["description"] = result.strip()
    save_document(doc)
    return item


@router.delete("/{doc_id}/evidence/{evidence_id}", status_code=204)
def delete_evidence(doc_id: str, evidence_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    items = doc.get("evidence", [])
    item = next((i for i in items if i["id"] == evidence_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence item not found")

    if item["type"] == "file" and item.get("filename"):
        fp = _evidence_file_dir(user["id"], doc_id) / f"{evidence_id}_{item['filename']}"
        if fp.exists():
            fp.unlink()

    doc["evidence"] = [i for i in items if i["id"] != evidence_id]
    save_document(doc)
    remove_evidence_chunks(user["id"], doc_id, evidence_id)
