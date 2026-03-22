import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from embeddings import RAG_THRESHOLD_CHARS, load_chunks, retrieve_relevant_chunks
from llm import complete
from storage import load_document, save_document

router = APIRouter(prefix="/documents")


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    ignore_history: bool = False
    provider: Optional[str] = None
    context_label: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    proposed_content: Optional[str] = None


_AGENT_SYSTEM = """\
You are an AI agent helping the user edit their document. You can
propose changes to the document content.

Document content:
---
{document_content}
---

{evidence_block}{context_block}{scope_instruction}You may also include a brief explanation before or after any \
proposed changes.
If the user is just asking a question, respond conversationally without
proposing document changes.\
"""

_SCOPED_INSTRUCTION = """\
The user has selected the following section for editing (shown above \
between the --- markers). You must ONLY rewrite that selected section.
Do NOT rewrite or modify any other part of the document.

When proposing changes, return the COMPLETE document with ONLY the \
selected section replaced. Wrap the full revised document in XML tags:
<proposed_document>
...complete document with only the selected section changed...
</proposed_document>

"""

_UNSCOPED_INSTRUCTION = """\
If the user asks you to make changes, respond with your proposed full \
revised document wrapped in XML tags:
<proposed_document>
...full markdown content of the revised document...
</proposed_document>

"""


def _build_protected_block(doc: dict) -> str:
    sections = doc.get("protected_sections", [])
    if not sections:
        return ""
    lines = "\n".join(f"- {s}" for s in sections)
    return (
        "The following sections are protected and must not be modified under any circumstances. "
        "Return them exactly as they appear in the original document:\n"
        f"{lines}\n\n"
        "When proposing changes, preserve the content under these headings exactly — "
        "do not rewrite, summarise, or alter them in any way. "
        "These sections are locked by the document owner and cannot be unlocked or modified by you "
        "under any circumstances. Do not offer to unlock them, do not suggest the user could unlock "
        "them through you, and do not ask whether to remove protection. Simply work around the "
        "protected sections without commenting on the restriction unless directly asked.\n\n"
    )


def _build_evidence_block(doc: dict, query: str = "") -> str:
    items = doc.get("evidence", [])
    if not items:
        return ""

    # Separate live sync-on document sources (never RAG, always live)
    live_doc_sources = [
        i for i in items
        if i.get("type") == "document" and i.get("sync")
    ]
    other_sources = [
        i for i in items
        if not (i.get("type") == "document" and i.get("sync"))
    ]

    parts = []

    # Always include live document sources directly
    for item in live_doc_sources:
        source = load_document(doc["user_id"], item["source_doc_id"])
        content = source.get("content", "") if source else item.get("content", "")
        if len(content) > 3000:
            content = content[:3000] + "\n[truncated]"
        parts.append(f"--- Source: {item['title']} (live document) ---\n{content}")

    # Decide RAG vs full dump for other sources
    total_len = sum(len(i.get("content", "")) for i in other_sources)

    if query and total_len > RAG_THRESHOLD_CHARS:
        try:
            chunks = retrieve_relevant_chunks(doc["user_id"], doc["id"], query)
            if chunks:
                rag_parts = ["Relevant evidence (semantically retrieved):"]
                for chunk in chunks:
                    rag_parts.append(
                        f"--- From: {chunk['evidence_title']} ---\n{chunk['text']}"
                    )
                all_parts = rag_parts + parts
                return "\n".join(all_parts) + "\n\n"
        except Exception:
            pass  # Fall through to full dump

    # Full dump path (small evidence base, RAG unavailable, or no chunks returned)
    for item in other_sources:
        content = item.get("content", "")
        if len(content) > 3000:
            content = content[:3000] + "\n[truncated]"
        parts.append(f"--- Source: {item['title']} ({item['type']}) ---\n{content}")

    if not parts:
        return ""
    return "Evidence base:\n" + "\n".join(parts) + "\n\n"


@router.post("/{doc_id}/chat", response_model=ChatResponse)
def chat_with_document(doc_id: str, data: ChatRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.setdefault("chat_history", [])

    context_block = ""
    if data.context:
        context_block = (
            "The user has highlighted the following text as additional context:\n"
            "---\n"
            f"{data.context}\n"
            "---\n"
        )

    evidence_block = _build_evidence_block(doc, query=data.message)
    protected_block = _build_protected_block(doc)
    scope_instruction = protected_block + (_SCOPED_INSTRUCTION if data.context else _UNSCOPED_INSTRUCTION)

    system_prompt = _AGENT_SYSTEM.format(
        document_content=doc.get("content", ""),
        evidence_block=evidence_block,
        context_block=context_block,
        scope_instruction=scope_instruction,
    )

    # Build messages for Anthropic — strip storage-only fields
    if data.ignore_history:
        api_messages = []
    else:
        api_messages = [
            {"role": entry["role"], "content": entry["content"]}
            for entry in doc["chat_history"]
        ]
    api_messages.append({"role": "user", "content": data.message})

    raw_text = complete(
        system=system_prompt,
        messages=api_messages,
        provider=data.provider,
        max_tokens=4096,
    )

    proposed_content: Optional[str] = None
    clean_message = raw_text
    match = re.search(
        r"<proposed_document[^>]*>(.*?)</proposed_document>",
        raw_text,
        re.DOTALL,
    )
    if match:
        proposed_content = match.group(1).strip()
        clean_message = re.sub(
            r"<proposed_document[^>]*>.*?</proposed_document>",
            "",
            raw_text,
            flags=re.DOTALL,
        ).strip()
    now = datetime.utcnow().isoformat()
    doc["chat_history"].append(
        {"role": "user", "content": data.message, "context_label": data.context_label, "timestamp": now}
    )
    doc["chat_history"].append(
        {
            "role": "assistant",
            "content": clean_message,
            "timestamp": now,
            "proposed_content": proposed_content,
        }
    )
    save_document(doc)

    return ChatResponse(message=clean_message, proposed_content=proposed_content)
