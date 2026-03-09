"""
LogbookLM MCP Server (server-side)
Scoped to /opt/logbooklm. Auth: OAuth 2.0 via FastMCP InMemoryOAuthProvider (required by claude.ai).
Port: 8765
"""

import os
import subprocess
from pathlib import Path

from fastmcp import FastMCP
from mcp.server.auth.settings import ClientRegistrationOptions

from oauth_provider import PersistentOAuthProvider

REPO_ROOT = Path(os.getenv("REPO_ROOT", "/opt/logbooklm"))
BASE_URL = os.getenv("MCP_BASE_URL", "http://localhost:8765")
OAUTH_STATE_FILE = Path(os.getenv("OAUTH_STATE_FILE", "/var/logbooklm/oauth_state.json"))

mcp = FastMCP(
    "logbooklm-server",
    auth=PersistentOAuthProvider(
        state_file=OAUTH_STATE_FILE,
        base_url=BASE_URL,
        client_registration_options=ClientRegistrationOptions(enabled=True),
    ),
)


def _check_path(path: Path) -> Path:
    resolved = path.resolve()
    if not str(resolved).startswith(str(REPO_ROOT.resolve())):
        raise ValueError(f"Path outside allowed root: {resolved}")
    return resolved


@mcp.tool()
def get_recent_commits(n: int = 10) -> str:
    """Return the last n git commits for the repo."""
    result = subprocess.run(
        ["git", "log", f"-{n}", "--oneline"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    return result.stdout or result.stderr


@mcp.tool()
def get_current_diff() -> str:
    """Return the current git diff (unstaged + staged)."""
    result = subprocess.run(
        ["git", "diff", "HEAD"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    return result.stdout or "(no diff)"


@mcp.tool()
def read_session_log() -> str:
    """Read the session log file."""
    log_path = REPO_ROOT / "mcp" / ".session_log.md"
    if not log_path.exists():
        return "(no session log found)"
    return log_path.read_text()


@mcp.tool()
def read_file(relative_path: str) -> str:
    """Read a file relative to the repo root."""
    target = _check_path(REPO_ROOT / relative_path)
    if not target.exists():
        return f"(file not found: {relative_path})"
    return target.read_text()


@mcp.tool()
def list_files(relative_path: str = ".") -> list[str]:
    """List files in a directory relative to the repo root."""
    target = _check_path(REPO_ROOT / relative_path)
    if not target.is_dir():
        return [f"(not a directory: {relative_path})"]
    return [str(p.relative_to(REPO_ROOT)) for p in sorted(target.rglob("*")) if p.is_file()]


if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8765)
