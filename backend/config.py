import os

from fastapi import APIRouter

router = APIRouter()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")


@router.get("/config")
def get_config():
    return {"llm_provider": LLM_PROVIDER}
