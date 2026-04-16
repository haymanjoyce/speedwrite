from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_actions_used, get_byok_key, get_current_user, increment_action_count
from chat import _build_evidence_block
from limits import FREE_ACTION_CAP
from llm import complete
from storage import load_document, save_document

router = APIRouter(prefix="/documents")

_SYSTEM = """\
You are an AI assistant helping the user analyse and understand their evidence sources. \
You answer questions based on the evidence provided to you.

{source_inventory}\
{context_block}\
Be precise, cite which source your answer comes from when possible, \
and acknowledge when information is not available in the provided sources.\
"""


class EvidenceChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    context_label: Optional[str] = None
    ignore_history: bool = False


class EvidenceChatResponse(BaseModel):
    message: str


@router.delete("/{doc_id}/evidence-chat")
def clear_evidence_chat_history(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc["evidence_chat_history"] = []
    save_document(doc)
    return {"ok": True}


@router.post("/{doc_id}/evidence-chat", response_model=EvidenceChatResponse)
def evidence_chat(doc_id: str, data: EvidenceChatRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    byok_key = get_byok_key(user)
    if not byok_key:
        actions_used = get_actions_used(user)
        if actions_used >= FREE_ACTION_CAP:
            raise HTTPException(
                status_code=429,
                detail=f"Monthly limit of {FREE_ACTION_CAP} AI actions reached. Add your Anthropic API key in Account settings to continue."
            )
    doc.setdefault("evidence_chat_history", [])

    evidence_items = doc.get("evidence", [])
    if evidence_items:
        lines = "\n".join(f"- {item['title']} ({item['type']})" for item in evidence_items)
        source_inventory = f"Available sources ({len(evidence_items)} total):\n{lines}\n\n"
    else:
        source_inventory = ""

    if data.context:
        label = data.context_label or "Attached source"
        context_block = (
            f"The user has attached the following evidence source:\n"
            f"--- Source: {label} ---\n"
            f"{data.context}\n"
            f"---\n\n"
        )
    else:
        context_block = _build_evidence_block(doc, data.message)

    system_prompt = _SYSTEM.format(source_inventory=source_inventory, context_block=context_block)

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
        byok_key=byok_key,
    )
    increment_action_count(user["id"])

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
