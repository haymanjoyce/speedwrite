from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from auth import get_current_user
from storage import DOCS_DIR

router = APIRouter(prefix="/documents")

ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def _image_dir(user_id: str, doc_id: str) -> Path:
    return DOCS_DIR / user_id / doc_id / "images"


def _unique_filename(directory: Path, filename: str) -> str:
    stem = Path(filename).stem
    suffix = Path(filename).suffix
    candidate = filename
    counter = 1
    while (directory / candidate).exists():
        candidate = f"{stem}-{counter}{suffix}"
        counter += 1
    return candidate


class ImageItem(BaseModel):
    filename: str
    url: str
    size_bytes: int


def _list_images(user_id: str, doc_id: str) -> list[dict]:
    directory = _image_dir(user_id, doc_id)
    if not directory.exists():
        return []
    items = []
    for f in sorted(directory.iterdir()):
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
            items.append({
                "filename": f.name,
                "url": f"/api/documents/{doc_id}/images/{f.name}",
                "size_bytes": f.stat().st_size,
            })
    return items


@router.post("/{doc_id}/images", response_model=list[ImageItem])
async def upload_image(doc_id: str, file: UploadFile = File(...), user=Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, GIF, and WebP images are supported")

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 5 MB size limit")

    directory = _image_dir(user["id"], doc_id)
    directory.mkdir(parents=True, exist_ok=True)

    filename = _unique_filename(directory, file.filename)
    (directory / filename).write_bytes(data)

    return _list_images(user["id"], doc_id)


@router.get("/{doc_id}/images", response_model=list[ImageItem])
def list_images(doc_id: str, user=Depends(get_current_user)):
    return _list_images(user["id"], doc_id)


@router.get("/{doc_id}/images/{filename}")
def serve_image(doc_id: str, filename: str, user=Depends(get_current_user)):
    path = _image_dir(user["id"], doc_id) / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)


@router.delete("/{doc_id}/images/{filename}", status_code=204)
def delete_image(doc_id: str, filename: str, user=Depends(get_current_user)):
    path = _image_dir(user["id"], doc_id) / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found")
    path.unlink()
