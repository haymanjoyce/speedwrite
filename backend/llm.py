import os
from typing import Optional

import anthropic
import httpx
from fastapi import HTTPException

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")
FREE_MODEL = "claude-haiku-4-5-20251001"  # Sonnet: "claude-sonnet-4-20250514"
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.2")


def complete(
    system: str,
    messages: list[dict],
    provider: Optional[str] = None,
    max_tokens: int = 2048,
) -> str:
    """
    Call the LLM and return the response text.
    provider overrides LLM_PROVIDER env var if set.
    messages format: [{"role": "user"|"assistant", "content": "string"}]
    """
    effective_provider = provider or LLM_PROVIDER

    if effective_provider == "ollama":
        return _complete_ollama(system, messages, max_tokens)
    else:
        return _complete_anthropic(system, messages, max_tokens)


def _complete_anthropic(system: str, messages: list[dict], max_tokens: int) -> str:
    client = anthropic.Anthropic()
    response = client.messages.create(
        model=FREE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return response.content[0].text


# NOTE: Ollama chat is not currently exposed. _complete_ollama() is retained
# for future use. LLM_PROVIDER env var would need to be set to "ollama" to
# activate it, along with a UI toggle. Do not remove without discussion.
def _complete_ollama(system: str, messages: list[dict], max_tokens: int) -> str:
    ollama_messages = [{"role": "system", "content": system}] + messages
    try:
        timeout = httpx.Timeout(connect=10.0, read=300.0, write=30.0, pool=10.0)
        resp = httpx.post(
            f"{OLLAMA_HOST}/api/chat",
            json={
                "model": OLLAMA_CHAT_MODEL,
                "messages": ollama_messages,
                "stream": False,
                "options": {"num_predict": max_tokens},
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not available. Please check that Ollama is running."
        )
    except httpx.ReadTimeout:
        raise HTTPException(
            status_code=504,
            detail="Ollama timed out. The model may be overloaded or too large for your hardware."
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ollama error: {str(e)}"
        )
