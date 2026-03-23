import json
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from llm import complete
from storage import DATA_DIR

router = APIRouter(prefix="/templates")

TEMPLATES_DIR = DATA_DIR / "templates"


class TemplateCreate(BaseModel):
    title: str
    description: str
    content: str


class PrefillRequest(BaseModel):
    template_content: str
    description: str


def _template_path(user_id: str, template_id: str) -> Path:
    return TEMPLATES_DIR / user_id / f"{template_id}.json"


def _list_user_templates(user_id: str) -> list:
    user_dir = TEMPLATES_DIR / user_id
    if not user_dir.exists():
        return []
    templates = []
    for f in user_dir.glob("*.json"):
        try:
            templates.append(json.loads(f.read_text()))
        except Exception:
            pass
    return sorted(templates, key=lambda t: t.get("created_at", ""), reverse=True)


@router.get("")
def list_templates(user=Depends(get_current_user)):
    templates = _list_user_templates(user["id"])
    return [
        {
            "id": t["id"],
            "title": t["title"],
            "description": t.get("description", ""),
            "created_at": t["created_at"],
        }
        for t in templates
    ]


@router.post("/prefill")
def prefill_template(data: PrefillRequest, user=Depends(get_current_user)):
    system = (
        "You are helping a user start a document. Fill in the template below with relevant, "
        "specific content based on the user's description. Keep the structure and headings intact. "
        "Replace placeholder text in brackets with actual content. Be specific and useful, not generic."
    )
    user_msg = f"Template:\n{data.template_content}\n\nDescription: {data.description}"
    content = complete(system, [{"role": "user", "content": user_msg}], max_tokens=2048)
    return {"content": content}


@router.get("/{template_id}")
def get_template(template_id: str, user=Depends(get_current_user)):
    path = _template_path(user["id"], template_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    return json.loads(path.read_text())


@router.post("")
def create_template(data: TemplateCreate, user=Depends(get_current_user)):
    template_id = str(uuid.uuid4())
    template = {
        "id": template_id,
        "user_id": user["id"],
        "title": data.title,
        "description": data.description,
        "content": data.content,
        "created_at": datetime.utcnow().isoformat(),
    }
    path = _template_path(user["id"], template_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(template, indent=2))
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: str, user=Depends(get_current_user)):
    path = _template_path(user["id"], template_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    data = json.loads(path.read_text())
    if data.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    path.unlink()
