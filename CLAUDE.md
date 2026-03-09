# LogbookLM — Claude Code Context

## Project Overview

LogbookLM is an AI-powered engineering logbook. It captures git activity, diffs, and session logs to give an LLM full context of ongoing development work. The MCP servers expose repo state as tools that Claude Code (and other MCP clients) can call.

## Repository Structure

```
logbooklm/
├── backend/          # FastAPI app (Python 3.12)
├── frontend/         # React 18 + Vite + Tailwind CSS
├── mcp/              # MCP servers (server-side + local)
├── nginx/            # Nginx reverse proxy configs
├── docker-compose.yml
├── bootstrap.sh      # One-time VPS setup script
├── deploy.sh         # Redeploy script (git pull + docker build)
└── CLAUDE.md         # This file
```

## Docker Stack

| Service    | Image / Build  | Internal Port | Purpose                            |
|------------|---------------|---------------|------------------------------------|
| `app`      | `./backend`    | 8000          | FastAPI backend                    |
| `frontend` | `./frontend`   | —             | Build-only; copies /dist to volume |
| `nginx`    | nginx:1.27     | 80, 443       | Reverse proxy + static file server |
| `mcp`      | `./mcp`        | 8765          | MCP server (server-side)           |

All services share an internal Docker bridge network called `internal`.
`/var/logbooklm` is mounted into `app` and `mcp` for persistent data.
`/opt/logbooklm` is mounted read-only into `mcp` so it can read the repo.

## Running Locally

```bash
# Copy and populate .env first
cp .env.example .env   # (create this when needed)

docker compose up --build
```

- Backend API: http://localhost:8000
- Health check: http://localhost:8000/health
- MCP server: http://localhost:8765/mcp (OAuth protected)

### Running the local MCP server (no Docker)

```bash
cd mcp
pip install -r requirements.txt
python local_server.py
# Starts on port 8766, OAuth state saved to mcp/.oauth_state.json
```

## Deploying to Production

```bash
# First time only — run as root on a fresh Ubuntu 24.04 VPS
bash bootstrap.sh

# Subsequent deploys
bash deploy.sh
```

## MCP Servers

### Transport
Both servers use **Streamable HTTP** transport (not SSE). Claude.ai requires this — SSE returns 405 on POST requests.

### Authentication
Both servers use **OAuth 2.0** via a custom `PersistentOAuthProvider` (see `mcp/oauth_provider.py`). Claude.ai web requires OAuth — it does not support static Bearer tokens for remote MCP connections.

Key lessons learned:
- `InMemoryOAuthProvider` alone fails after server restarts — tokens are lost
- `PersistentOAuthProvider` subclasses it and persists clients/tokens to a JSON file
- Auth codes are intentionally NOT persisted (short-lived, single-use)
- The OAuth discovery endpoint must advertise the public URL (not localhost) — set via `MCP_BASE_URL` env var
- Dynamic Client Registration (DCR) must be enabled — claude.ai registers itself as a client

### local_server.py (port 8766) — local development
- Scoped to repo root (auto-detected from `__file__`)
- OAuth state persisted to `mcp/.oauth_state.json`
- Base URL defaults to `https://local.logbooklm.com`
- Exposed via Cloudflare Tunnel (`local-mcp` tunnel) at `https://local.logbooklm.com`
- Start: `python mcp/local_server.py`
- Also requires Cloudflare tunnel: `cloudflared tunnel run local-mcp`

### server.py (port 8765) — server-side, Docker
- Scoped to `/opt/logbooklm`
- OAuth state persisted to `/var/logbooklm/oauth_state.json` (on Docker volume, survives restarts)
- Base URL from `MCP_BASE_URL` env var (set to `https://mcp.logbooklm.com` in production)
- Exposed at `mcp.logbooklm.com` via Nginx reverse proxy

### oauth_provider.py
Custom persistent OAuth provider. Do not modify without understanding the full OAuth flow. Key behaviours:
- Loads state from JSON file on startup
- Saves after every mutation (register, token exchange, revoke)
- Auth codes not persisted (intentional)

### Connecting to claude.ai
1. Go to Settings → Integrations → Add custom connector
2. URL: `https://local.logbooklm.com/mcp` (note: /mcp not /sse)
3. No auth headers needed — OAuth flow completes automatically in browser
4. Set all tools to "Always allow" in connector settings

### Available Tools

| Tool                 | Description                           |
|----------------------|---------------------------------------|
| `get_recent_commits` | Last N git commits (default 10)       |
| `get_current_diff`   | `git diff HEAD` output                |
| `read_session_log`   | Contents of `mcp/.session_log.md`     |
| `read_file`          | Read any file within the repo root    |
| `list_files`         | List files in a directory             |

## Session Log Instructions

**Claude Code must:**
1. Append a new session entry to `mcp/.session_log.md` at the **start of each session**.
2. Append a brief summary entry after any **significant action** (new feature, refactor, fix, deploy).

Format:

```markdown
## Session YYYY-MM-DD HH:MM

**Goal:** <what was the session goal>
**Actions:** <bullet list of key actions>
**Status:** <done / in-progress / blocked>
```

## Data Directories

| Path                          | Purpose                          |
|-------------------------------|----------------------------------|
| `/var/logbooklm/projects`     | Per-project data / session files |
| `/var/logbooklm/index_store`  | Vector index storage             |
| `mcp/.session_log.md`         | Running Claude Code session log  |

## Key Commands

```bash
# View logs
docker compose logs -f app
docker compose logs -f mcp

# Restart a single service
docker compose restart app

# Rebuild everything
docker compose up --build -d

# Check container health
docker compose ps
```

## Environment Variables

| Variable           | Required | Description                                              |
|--------------------|----------|----------------------------------------------------------|
| `MCP_BASE_URL`     | Yes      | Public URL advertised in OAuth discovery metadata        |
| `OAUTH_STATE_FILE` | No       | Override path for OAuth state JSON (server.py only)      |

Create a `.env` file in the repo root with these values before starting Docker.
