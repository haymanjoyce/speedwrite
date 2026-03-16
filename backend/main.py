from fastapi import FastAPI

from auth import router as auth_router
from chat import router as chat_router
from documents import router as documents_router

app = FastAPI(title="LogbookLM API")

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chat_router)


@app.get("/health")
def health():
    return {"status": "ok"}
