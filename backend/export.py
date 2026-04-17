import re

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from auth import get_current_user
from storage import load_document

router = APIRouter(prefix="/documents")


def _sanitise_filename(title: str) -> str:
    safe = re.sub(r'[^\w\s-]', '', title).strip()
    safe = re.sub(r'\s+', '_', safe)
    return safe or 'document'


def _strip_markdown(text: str) -> str:
    lines = text.split('\n')
    result = []
    in_code_block = False
    for line in lines:
        if line.startswith('```'):
            in_code_block = not in_code_block
            continue
        if in_code_block:
            result.append(line)
            continue
        line = re.sub(r'^#{1,6}\s+', '', line)
        line = re.sub(r'^>\s+', '', line)
        line = re.sub(r'^[-*+]\s+', '', line)
        line = re.sub(r'^\d+\.\s+', '', line)
        if re.match(r'^[-*_]{3,}\s*$', line):
            line = ''
        line = re.sub(r'\*{3}(.+?)\*{3}', r'\1', line)
        line = re.sub(r'\*{2}(.+?)\*{2}', r'\1', line)
        line = re.sub(r'\*(.+?)\*', r'\1', line)
        line = re.sub(r'_{3}(.+?)_{3}', r'\1', line)
        line = re.sub(r'_{2}(.+?)_{2}', r'\1', line)
        line = re.sub(r'_(.+?)_', r'\1', line)
        line = re.sub(r'`([^`]+)`', r'\1', line)
        line = re.sub(r'!\[[^\]]*\]\([^\)]+\)', '', line)
        line = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', line)
        result.append(line)
    # Collapse runs of blank lines to a single blank line
    cleaned = []
    prev_blank = False
    for line in result:
        if line.strip() == '':
            if not prev_blank:
                cleaned.append('')
            prev_blank = True
        else:
            prev_blank = False
            cleaned.append(line)
    return '\n'.join(cleaned)


_PDF_CSS = """
body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.7;
    margin: 2.5cm 3cm;
    color: #1a1a1a;
}
h1 { font-size: 22pt; margin: 1.4em 0 0.4em; }
h2 { font-size: 17pt; margin: 1.2em 0 0.3em; }
h3 { font-size: 14pt; margin: 1em 0 0.3em; }
p  { margin: 0.5em 0; }
ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
li { margin: 0.2em 0; }
code {
    font-family: 'Courier New', monospace;
    background: #f4f4f4;
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-size: 10pt;
}
pre {
    background: #f4f4f4;
    padding: 1em;
    border-radius: 4px;
    margin: 0.8em 0;
}
pre code { background: none; padding: 0; }
"""


@router.get("/{doc_id}/export/txt")
def export_txt(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    text = _strip_markdown(doc.get("content", ""))
    filename = _sanitise_filename(doc.get("title", "document")) + ".txt"
    return Response(
        content=text.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{doc_id}/export/md")
def export_md(doc_id: str, user=Depends(get_current_user)):
    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    content = doc.get("content", "")
    filename = _sanitise_filename(doc.get("title", "document")) + ".md"
    return Response(
        content=content.encode("utf-8"),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{doc_id}/export/pdf")
def export_pdf(doc_id: str, user=Depends(get_current_user)):
    import markdown as md
    from weasyprint import HTML

    doc = load_document(user["id"], doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    html_body = md.markdown(doc.get("content", ""), extensions=["extra"])
    html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{_PDF_CSS}</style></head><body>{html_body}</body></html>"
    pdf_bytes = HTML(string=html).write_pdf()

    filename = _sanitise_filename(doc.get("title", "document")) + ".pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
