import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_actions_used, get_byok_key, get_current_user, increment_action_count
from limits import FREE_ACTION_CAP
from embeddings import RAG_THRESHOLD_CHARS, retrieve_relevant_chunks
from llm import complete
from storage import load_document, save_document

router = APIRouter(prefix="/documents")


class SectionPathStep(BaseModel):
    text: str
    index: int
    level: int


class ChatRequest(BaseModel):
    message: str
    # None = chat-only; [] = entire document rewrite; [...] = ancestor path to section
    section_path: Optional[list[SectionPathStep]] = None
    ignore_history: bool = False
    provider: Optional[str] = None
    structure_locked: bool = False


class ChatResponse(BaseModel):
    message: str
    proposed_content: Optional[str] = None


_AGENT_SYSTEM = """\
You are an AI agent helping the user edit their document.

Document content:
---
{document_content}
---

{evidence_block}{context_block}{scope_instruction}\
"""

_SECTION_REWRITE_INSTRUCTION = """\
Return the rewritten section inside <proposed_section> tags. Start from the section's \
heading line (e.g. `## Section title`) — include it even if you rename it — through \
the end of the section's content, including any subsections within scope. \
Do not modify anything outside the marked rewrite target.

Example format:
<proposed_section>
## Section heading
Content here...
</proposed_section>
"""

_FULL_DOC_REWRITE_INSTRUCTION = """\
Return the complete rewritten document inside <proposed_section> tags. \
Do not include an outer heading — begin from the first line of document content.

Example format:
<proposed_section>
# Document title
Content here...
</proposed_section>
"""

_CHAT_ONLY_INSTRUCTION = """\
You are in chat-only mode. Respond conversationally to the user's message. \
Do not propose document changes and do not return a <proposed_section> block \
under any circumstances.
"""

_PRESERVE_INSTRUCTION = (
    "CRITICAL INSTRUCTION — PRESERVE THESE ELEMENTS EXACTLY: You must return the following elements "
    "completely unchanged in any proposed document. Do not rewrite, reformat, remove, summarise, or "
    "paraphrase them under any circumstances. This rule overrides all other instructions:\n"
    "- Markdown tables (pipe-delimited rows and separator lines)\n"
    "- Markdown image references (![alt](url) syntax)\n"
    "- Fenced code blocks (``` delimited, including the language tag)\n"
    "- Blockquotes (> prefixed lines)\n"
    "If any of these elements exist in the original document, they must appear verbatim in your proposed document."
)


def _build_structure_lock_block(structure_locked: bool) -> str:
    if not structure_locked:
        return ""
    return (
        "The document structure is locked. Do not add, remove, reorder, or rename any sections. "
        "Rewrite the content within sections freely. "
        "The structure lock is a constraint — always proceed with the rewrite, doing as much as permitted.\n\n"
    )



def _build_evidence_block(doc: dict, query: str = "") -> str:
    items = [i for i in doc.get("evidence", []) if i.get("active", True)]
    if not items:
        return ""

    live_doc_sources = [
        i for i in items
        if i.get("type") == "document" and i.get("sync")
    ]
    other_sources = [
        i for i in items
        if not (i.get("type") == "document" and i.get("sync"))
    ]

    parts = []

    for item in live_doc_sources:
        source = load_document(doc["user_id"], item["source_doc_id"])
        content = source.get("content", "") if source else item.get("content", "")
        if len(content) > 3000:
            content = content[:3000] + "\n[truncated]"
        parts.append(f"--- Source: {item['title']} (live document) ---\n{content}")

    total_len = sum(len(i.get("content", "")) for i in other_sources)

    if query and total_len > RAG_THRESHOLD_CHARS:
        try:
            active_ids = {i["id"] for i in other_sources}
            chunks = retrieve_relevant_chunks(doc["user_id"], doc["id"], query, active_ids=active_ids)
            if chunks:
                rag_parts = ["Relevant evidence (semantically retrieved):"]
                for chunk in chunks:
                    rag_parts.append(
                        f"--- From: {chunk['evidence_title']} ---\n{chunk['text']}"
                    )
                all_parts = rag_parts + parts
                return "\n".join(all_parts) + "\n\n"
        except Exception:
            pass

    for item in other_sources:
        content = item.get("content", "")
        if len(content) > 3000:
            content = content[:3000] + "\n[truncated]"
        parts.append(f"--- Source: {item['title']} ({item['type']}) ---\n{content}")

    if not parts:
        return ""
    return "Evidence base:\n" + "\n".join(parts) + "\n\n"


def _locate_section(content: str, path: list[SectionPathStep]) -> tuple[int, int] | None:
    """
    Locate a section in `content` by following the ancestor path.
    Returns (start_line_idx, end_line_idx) where lines[start:end] is the full
    section including its heading line. Returns None if the path cannot be resolved.
    """
    lines = content.split("\n")
    n = len(lines)

    heading_positions: list[tuple[int, int, str]] = []
    for i, line in enumerate(lines):
        m = re.match(r"^(#{1,6})\s+(.+)", line)
        if m:
            heading_positions.append((i, len(m.group(1)), m.group(2).strip()))

    search_start = 0
    search_end = n
    current_start = 0
    current_level = 0
    current_end = n

    for step in path:
        matches = [
            (li, level)
            for li, level, text in heading_positions
            if search_start <= li < search_end and text == step.text and level == step.level
        ]
        if step.index >= len(matches):
            return None

        current_start, current_level = matches[step.index]

        current_end = n
        for li, level, _ in heading_positions:
            if li <= current_start:
                continue
            if level <= current_level:
                current_end = li
                break

        search_start = current_start + 1
        search_end = current_end

    return current_start, current_end


@router.delete("/{doc_id}/chat")
def clear_chat_history(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc["chat_history"] = []
    save_document(doc)
    return {"ok": True}


@router.post("/{doc_id}/chat", response_model=ChatResponse)
def chat_with_document(doc_id: str, data: ChatRequest, user=Depends(get_current_user)):
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
    doc.setdefault("chat_history", [])

    doc_content = doc.get("content", "")
    is_chat_only = data.section_path is None
    is_full_doc = data.section_path is not None and len(data.section_path) == 0

    # Derive context_label for chat history storage
    if is_chat_only:
        context_label = None
    elif is_full_doc:
        context_label = "Entire document"
    else:
        context_label = data.section_path[-1].text

    section_start: int | None = None
    section_end: int | None = None

    if is_chat_only:
        context_block = ""
        scope_instruction = _CHAT_ONLY_INSTRUCTION
    elif is_full_doc:
        context_block = (
            "The full document is the rewrite target:\n"
            "---\n"
            f"{doc_content}\n"
            "---\n\n"
        )
        scope_instruction = _FULL_DOC_REWRITE_INSTRUCTION
    else:
        result = _locate_section(doc_content, data.section_path)
        if result is None:
            error_msg = (
                "Could not locate the attached section in the document — it may have been "
                "renamed or removed since you attached it. Please re-attach the section and try again."
            )
            now = datetime.utcnow().isoformat()
            doc["chat_history"].append(
                {"role": "user", "content": data.message, "context_label": context_label, "timestamp": now}
            )
            doc["chat_history"].append(
                {"role": "assistant", "content": error_msg, "timestamp": now}
            )
            save_document(doc)
            return ChatResponse(message=error_msg, proposed_content=None)

        section_start, section_end = result
        section_lines = doc_content.split("\n")[section_start:section_end]
        section_content = "\n".join(section_lines)
        context_block = (
            "Rewrite target section (marked for editing):\n"
            "---\n"
            f"{section_content}\n"
            "---\n\n"
        )
        scope_instruction = _SECTION_REWRITE_INSTRUCTION

    evidence_block = _build_evidence_block(doc, query=data.message)
    structure_lock_block = _build_structure_lock_block(data.structure_locked)
    full_scope = structure_lock_block + scope_instruction

    system_prompt = _PRESERVE_INSTRUCTION + "\n\n" + _AGENT_SYSTEM.format(
        document_content=doc_content,
        evidence_block=evidence_block,
        context_block=context_block,
        scope_instruction=full_scope,
    )

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
        max_tokens=8192,
        provider=data.provider,
        byok_key=byok_key,
    )
    increment_action_count(user["id"])

    proposed_content: Optional[str] = None
    clean_message = raw_text

    if not is_chat_only:
        match = re.search(
            r"<proposed_section[^>]*>(.*?)</proposed_section>",
            raw_text,
            re.DOTALL,
        )
        if match:
            rewritten = match.group(1).strip()
            clean_message = re.sub(
                r"<proposed_section[^>]*>.*?</proposed_section>",
                "",
                raw_text,
                flags=re.DOTALL,
            ).strip()
            if is_full_doc:
                proposed_content = rewritten
            else:
                lines = doc_content.split("\n")
                new_lines = lines[:section_start] + rewritten.split("\n") + lines[section_end:]
                proposed_content = "\n".join(new_lines)
        else:
            clean_message = (
                "The rewrite could not be completed — the AI response was malformed. Please try again."
            )

    now = datetime.utcnow().isoformat()
    doc["chat_history"].append(
        {"role": "user", "content": data.message, "context_label": context_label, "timestamp": now}
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
