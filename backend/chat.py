import re
from datetime import datetime
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from storage import load_document, save_document

router = APIRouter(prefix="/documents")


class ChatRequest(BaseModel):
    message: str
    mode: str = "chat"  # "chat" | "agent"
    context: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    proposed_content: Optional[str] = None
    mode: str


_CHAT_SYSTEM = """\
You are an AI assistant helping the user work with their document.
You can answer questions, provide summaries, suggest ideas, and discuss
the content. You cannot make changes to the document directly.

Document content:
---
{document_content}
---

{context_block}
Respond conversationally and helpfully.\
"""

_AGENT_SYSTEM = """\
You are an AI agent helping the user edit their document. You can
propose changes to the document content.

Document content:
---
{document_content}
---

{context_block}
If the user asks you to make changes to the document, respond with your
proposed full revised document wrapped in XML tags like this:
<proposed_document>
...full markdown content of the revised document...
</proposed_document>

You may also include a brief explanation before or after the tags.
If the user is just asking a question, respond conversationally without
proposing document changes.\
"""


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

    template = _AGENT_SYSTEM if data.mode == "agent" else _CHAT_SYSTEM
    system_prompt = template.format(
        document_content=doc.get("content", ""),
        context_block=context_block,
    )

    # Build messages for Anthropic — strip storage-only fields
    api_messages = [
        {"role": entry["role"], "content": entry["content"]}
        for entry in doc["chat_history"]
    ]
    api_messages.append({"role": "user", "content": data.message})

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2048,
        system=system_prompt,
        messages=api_messages,
    )
    raw_text = response.content[0].text

    # Extract proposed document in agent mode
    proposed_content: Optional[str] = None
    clean_message = raw_text
    if data.mode == "agent":
        match = re.search(
            r"<proposed_document>(.*?)</proposed_document>", raw_text, re.DOTALL
        )
        if match:
            proposed_content = match.group(1).strip()
            clean_message = re.sub(
                r"<proposed_document>.*?</proposed_document>",
                "",
                raw_text,
                flags=re.DOTALL,
            ).strip()

    now = datetime.utcnow().isoformat()
    doc["chat_history"].append(
        {"role": "user", "content": data.message, "mode": data.mode, "timestamp": now}
    )
    doc["chat_history"].append(
        {
            "role": "assistant",
            "content": clean_message,
            "mode": data.mode,
            "timestamp": now,
            "proposed_content": proposed_content,
        }
    )
    save_document(doc)

    return ChatResponse(message=clean_message, proposed_content=proposed_content, mode=data.mode)
