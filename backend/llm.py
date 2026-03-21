import os
from typing import Optional

import anthropic
import httpx

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")
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
        model="claude-sonnet-4-20250514",
        max_tokens=max_tokens,
        system=system,
        messages=messages,
    )
    return response.content[0].text


def _complete_ollama(system: str, messages: list[dict], max_tokens: int) -> str:
    ollama_messages = [{"role": "system", "content": system}] + messages
    resp = httpx.post(
        f"{OLLAMA_HOST}/api/chat",
        json={
            "model": OLLAMA_CHAT_MODEL,
            "messages": ollama_messages,
            "stream": False,
            "options": {"num_predict": max_tokens},
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["message"]["content"]
