import json
import math
import os
import threading
import uuid
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user
from storage import DOCS_DIR, load_document

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
EMBED_MODEL = "nomic-embed-text"
EMBEDDINGS_DIR = DOCS_DIR.parent / "embeddings"
CHUNK_SIZE = 2000
CHUNK_OVERLAP = 200
RAG_THRESHOLD_CHARS = 8000

router = APIRouter(prefix="/documents")

# --- Threading locks ---

_locks: dict[str, threading.Lock] = {}
_locks_mutex = threading.Lock()


def _get_lock(user_id: str, doc_id: str) -> threading.Lock:
    key = f"{user_id}:{doc_id}"
    with _locks_mutex:
        if key not in _locks:
            _locks[key] = threading.Lock()
        return _locks[key]


# --- Storage helpers ---

def _embeddings_path(user_id: str, doc_id: str):
    return EMBEDDINGS_DIR / user_id / f"{doc_id}.json"


def _load_chunks_unlocked(user_id: str, doc_id: str) -> list[dict]:
    path = _embeddings_path(user_id, doc_id)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text())
        return data.get("chunks", [])
    except Exception:
        return []


def _save_chunks_unlocked(user_id: str, doc_id: str, chunks: list[dict]) -> None:
    path = _embeddings_path(user_id, doc_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"version": 1, "chunks": chunks}, indent=2))


def load_chunks(user_id: str, doc_id: str) -> list[dict]:
    with _get_lock(user_id, doc_id):
        return _load_chunks_unlocked(user_id, doc_id)


# --- Text processing ---

def chunk_text(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        chunk = text[start:start + CHUNK_SIZE]
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


# --- Ollama embedding ---

def embed_text(text: str) -> Optional[list[float]]:
    try:
        resp = httpx.post(
            f"{OLLAMA_HOST}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["embedding"]
    except Exception:
        return None


# --- Similarity ---

def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# --- Indexing ---

def index_evidence_sync(
    user_id: str, doc_id: str, evidence_id: str, evidence_title: str, content: str
) -> bool:
    """Chunk and embed an evidence item. Returns True if successful."""
    text_chunks = chunk_text(content)
    new_chunks = []
    for i, chunk in enumerate(text_chunks):
        embedding = embed_text(chunk)
        if embedding is None:
            return False
        new_chunks.append({
            "chunk_id": str(uuid.uuid4()),
            "evidence_id": evidence_id,
            "evidence_title": evidence_title,
            "chunk_index": i,
            "text": chunk,
            "embedding": embedding,
        })
    with _get_lock(user_id, doc_id):
        existing = _load_chunks_unlocked(user_id, doc_id)
        existing = [c for c in existing if c["evidence_id"] != evidence_id]
        _save_chunks_unlocked(user_id, doc_id, existing + new_chunks)
    return True


def index_evidence_background(
    user_id: str, doc_id: str, evidence_id: str, evidence_title: str, content: str
) -> None:
    """Fire-and-forget embedding in a background thread."""
    def _run():
        try:
            index_evidence_sync(user_id, doc_id, evidence_id, evidence_title, content)
        except Exception as e:
            print(f"Embedding failed for evidence {evidence_id}: {e}")
    threading.Thread(target=_run, daemon=True).start()


def remove_evidence_chunks(user_id: str, doc_id: str, evidence_id: str) -> None:
    with _get_lock(user_id, doc_id):
        chunks = _load_chunks_unlocked(user_id, doc_id)
        chunks = [c for c in chunks if c["evidence_id"] != evidence_id]
        _save_chunks_unlocked(user_id, doc_id, chunks)


# --- Retrieval ---

def retrieve_relevant_chunks(
    user_id: str, doc_id: str, query: str, k: int = 5,
    evidence_id: Optional[str] = None,
) -> list[dict]:
    query_embedding = embed_text(query)
    if query_embedding is None:
        return []
    chunks = load_chunks(user_id, doc_id)
    if not chunks:
        return []
    if evidence_id is not None:
        chunks = [c for c in chunks if c["evidence_id"] == evidence_id]
    if not chunks:
        return []
    scored = [
        (cosine_similarity(query_embedding, c["embedding"]), c)
        for c in chunks
    ]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:k]]


# --- Router ---

@router.post("/{doc_id}/evidence/reindex")
def reindex_evidence(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    items = doc.get("evidence", [])

    def _run():
        for item in items:
            # Skip document-type sources with sync=on — their content is always live
            if item.get("type") == "document" and item.get("sync"):
                continue
            try:
                index_evidence_sync(
                    user["id"],
                    doc_id,
                    item["id"],
                    item.get("title", ""),
                    item.get("content", ""),
                )
            except Exception:
                pass

    threading.Thread(target=_run, daemon=True).start()
    return {"status": "started"}
