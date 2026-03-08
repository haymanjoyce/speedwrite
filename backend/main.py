from fastapi import FastAPI

app = FastAPI(title="LogbookLM API")


@app.get("/health")
def health():
    return {"status": "ok"}
