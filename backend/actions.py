import re
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from chat import _build_protected_block
from storage import load_document

router = APIRouter(prefix="/documents")

CHAT_ACTIONS = {"summarise", "extract_key_points"}
DIFF_ACTIONS = {"rewrite", "restructure", "expand", "condense"}

_USER_PROMPTS = {
    "summarise": (
        "Write a concise summary of this document in 3-4 sentences. "
        "Capture the main topic, key points, and purpose."
    ),
    "extract_key_points": (
        "Extract the key points from this document as a bullet list. "
        "Include the most important facts, arguments, or conclusions."
    ),
    "rewrite": (
        "Rewrite this entire document.{extra} "
        "Wrap the complete rewritten document in <proposed_document> tags."
    ),
    "restructure": (
        "Restructure this document for better organisation and flow. "
        "Reorder sections if needed, improve heading hierarchy, consolidate "
        "or split sections where appropriate.{extra} "
        "Wrap the restructured document in <proposed_document> tags."
    ),
    "expand": (
        "Expand this document by fleshing out thin sections and adding "
        "more detail, examples, and depth throughout.{extra} "
        "Wrap the expanded document in <proposed_document> tags."
    ),
    "condense": (
        "Condense this document by removing redundancy and unnecessary "
        "content while preserving all key information.{extra} "
        "Wrap the condensed document in <proposed_document> tags."
    ),
}

_SYSTEM = """\
You are an AI assistant helping the user work with their document.

Document title: {title}

Document content:
---
{content}
---

{protected_block}\
"""


class ActionRequest(BaseModel):
    action: str
    instructions: Optional[str] = ""


class ActionResponse(BaseModel):
    result: str
    proposed_content: Optional[str] = None


@router.post("/{doc_id}/action", response_model=ActionResponse)
def run_document_action(doc_id: str, data: ActionRequest, user=Depends(get_current_user)):
    if data.action not in CHAT_ACTIONS and data.action not in DIFF_ACTIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action: {data.action}")

    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    protected_block = _build_protected_block(doc)
    system_prompt = _SYSTEM.format(
        title=doc.get("title", "Untitled"),
        content=doc.get("content", ""),
        protected_block=protected_block,
    )

    extra = f" {data.instructions.strip()}" if data.instructions and data.instructions.strip() else ""
    user_message = _USER_PROMPTS[data.action].format(extra=extra)

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    raw_text = response.content[0].text

    proposed_content: Optional[str] = None
    result = raw_text
    match = re.search(r"<proposed_document>(.*?)</proposed_document>", raw_text, re.DOTALL)
    if match:
        proposed_content = match.group(1).strip()
        result = re.sub(
            r"<proposed_document>.*?</proposed_document>", "", raw_text, flags=re.DOTALL
        ).strip()

    return ActionResponse(result=result, proposed_content=proposed_content)
