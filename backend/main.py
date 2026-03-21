from fastapi import FastAPI

from actions import router as actions_router
from auth import router as auth_router
from embeddings import router as embeddings_router
from chat import router as chat_router
from documents import router as documents_router
from evidence import router as evidence_router
from log import router as log_router

app = FastAPI(title="LogbookLM API")

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(actions_router)
app.include_router(embeddings_router)
app.include_router(chat_router)
app.include_router(evidence_router)
app.include_router(log_router)


@app.get("/health")
def health():
    return {"status": "ok"}
