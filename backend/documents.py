import re
import uuid
from datetime import datetime

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from models import Document, DocumentCreate, DocumentUpdate
from storage import append_audit_log, delete_document, list_documents, load_document, save_document

router = APIRouter(prefix="/documents")


def extract_title(content: str) -> str:
    match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
    return match.group(1).strip() if match else ""


@router.post("/", response_model=Document)
def create_document(data: DocumentCreate, user=Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    content = data.content or ""
    title = data.title or extract_title(content) or "Untitled"
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": title,
        "content": content,
        "description": "",
        "created_at": now,
        "updated_at": now,
        "evidence": [],
        "audit_log": [],
        "shared_with": [],
        "protected_sections": [],
    }
    append_audit_log(doc, "document_created", "Document created")
    save_document(doc)
    return doc


@router.get("/", response_model=list[Document])
def list_user_documents(user=Depends(get_current_user)):
    return list_documents(user["id"])


@router.get("/{doc_id}", response_model=Document)
def get_document(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.put("/{doc_id}", response_model=Document)
def update_document(doc_id: str, data: DocumentUpdate, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if data.content is not None:
        doc["content"] = data.content
        # Re-derive title from H1 unless title was explicitly provided
        if data.title is None:
            derived = extract_title(data.content)
            if derived:
                doc["title"] = derived
    if data.title is not None:
        doc["title"] = data.title
    doc["updated_at"] = datetime.utcnow().isoformat()
    word_count = len(doc["content"].split()) if doc.get("content") else 0
    append_audit_log(doc, "document_edited", f"Document saved ({word_count} words)")
    save_document(doc)
    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_doc(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    append_audit_log(doc, "document_deleted", f"Document deleted: {doc.get('title', 'Untitled')}")
    save_document(doc)
    delete_document(user["id"], doc_id)


class ProtectRequest(BaseModel):
    heading: str


class DescribeResponse(BaseModel):
    description: str


@router.post("/{doc_id}/describe", response_model=DescribeResponse)
def describe_document(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    client = anthropic.Anthropic()
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        system="You are a helpful assistant that writes concise document summaries.",
        messages=[{
            "role": "user",
            "content": (
                "Write a short description of the following document in 3-4 sentences. "
                "The description should summarise what the document is about, its main topics, "
                "and who might find it useful. Write in third person, present tense.\n\n"
                f"Document title: {doc.get('title', 'Untitled')}\n\n"
                f"Document content:\n---\n{doc.get('content', '')}\n---\n\n"
                "Respond with only the description paragraph, no preamble or labels."
            ),
        }],
    )

    description = response.content[0].text.strip()
    doc["description"] = description
    save_document(doc)
    return DescribeResponse(description=description)


@router.post("/{doc_id}/protect")
def protect_section(doc_id: str, data: ProtectRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.setdefault("protected_sections", [])
    if data.heading not in doc["protected_sections"]:
        doc["protected_sections"].append(data.heading)
        save_document(doc)
    return doc["protected_sections"]


@router.delete("/{doc_id}/protect")
def unprotect_section(doc_id: str, data: ProtectRequest, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.setdefault("protected_sections", [])
    doc["protected_sections"] = [h for h in doc["protected_sections"] if h != data.heading]
    save_document(doc)
    return doc["protected_sections"]
