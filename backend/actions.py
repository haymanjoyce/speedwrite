from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_actions_used, get_byok_key, get_current_user, increment_action_count
from limits import FREE_ACTION_CAP
from llm import complete
from storage import load_document

router = APIRouter(prefix="/documents")

_GENERATE_DESCRIPTION_PROMPT = (
    "Write a 1-2 sentence plain-prose description of this document — what it is and what it covers. "
    "No markdown, no bullet points, no headers. Plain sentences only."
)

_SYSTEM = """\
You are an AI assistant helping the user work with their document.

Document title: {title}

Document content:
---
{content}
---
"""


class ActionRequest(BaseModel):
    action: str
    provider: Optional[str] = None


class ActionResponse(BaseModel):
    result: str


@router.post("/{doc_id}/action", response_model=ActionResponse)
def run_document_action(doc_id: str, data: ActionRequest, user=Depends(get_current_user)):
    if data.action != "generate_description":
        raise HTTPException(status_code=400, detail=f"Unknown action: {data.action}")

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

    system_prompt = _SYSTEM.format(
        title=doc.get("title", "Untitled"),
        content=doc.get("content", ""),
    )

    raw_text = complete(
        system=system_prompt,
        messages=[{"role": "user", "content": _GENERATE_DESCRIPTION_PROMPT}],
        max_tokens=4096,
        provider=data.provider,
        byok_key=byok_key,
    )
    increment_action_count(user["id"])

    return ActionResponse(result=raw_text.strip())
