from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from llm import complete
from storage import load_document, save_document

router = APIRouter(prefix="/documents")

_SYSTEM = """\
You are an AI assistant helping the user analyse and understand their evidence sources. \
You answer questions based on the evidence provided to you.

{context_block}\
If no evidence is attached, ask the user to attach a source using the + button before \
asking questions. Be precise, cite which source your answer comes from when possible, \
and acknowledge when information is not available in the provided sources.\
"""


class EvidenceChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    context_label: Optional[str] = None
    ignore_history: bool = False


class EvidenceChatResponse(BaseModel):
    message: str


@router.post("/{doc_id}/evidence-chat", response_model=EvidenceChatResponse)
def evidence_chat(doc_id: str, data: EvidenceChatRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.setdefault("evidence_chat_history", [])

    context_block = ""
    if data.context:
        label = data.context_label or "Attached source"
        context_block = (
            f"The user has attached the following evidence source:\n"
            f"--- Source: {label} ---\n"
            f"{data.context}\n"
            f"---\n\n"
        )

    system_prompt = _SYSTEM.format(context_block=context_block)

    if data.ignore_history:
        api_messages = []
    else:
        api_messages = [
            {"role": entry["role"], "content": entry["content"]}
            for entry in doc["evidence_chat_history"]
        ]
    api_messages.append({"role": "user", "content": data.message})

    raw_text = complete(
        system=system_prompt,
        messages=api_messages,
        max_tokens=4096,
    )

    now = datetime.utcnow().isoformat()
    doc["evidence_chat_history"].append({
        "role": "user",
        "content": data.message,
        "context_label": data.context_label,
        "timestamp": now,
    })
    doc["evidence_chat_history"].append({
        "role": "assistant",
        "content": raw_text,
        "context_label": None,
        "timestamp": datetime.utcnow().isoformat(),
    })
    save_document(doc)

    return EvidenceChatResponse(message=raw_text)
