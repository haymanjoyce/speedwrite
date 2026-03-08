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
- MCP server: http://localhost:8765 (requires Bearer token)

### Running the local MCP server (no Docker)

```bash
cd mcp
pip install -r requirements.txt
MCP_API_KEY=your-key REPO_ROOT=.. python local_server.py
# Starts on port 8766
```

## Deploying to Production

```bash
# First time only — run as root on a fresh Ubuntu 24.04 VPS
bash bootstrap.sh

# Subsequent deploys
bash deploy.sh
```

## MCP Servers

### server.py (port 8765) — server-side, Docker
- Scoped to `/opt/logbooklm` (the production repo clone)
- Auth: `Authorization: Bearer <MCP_API_KEY>` header required
- Transport: SSE

### local_server.py (port 8766) — local development
- Scoped to the repo root (auto-detected from `__file__`)
- Same Bearer token auth via `MCP_API_KEY` env var
- Transport: SSE

### Available Tools

| Tool                | Description                              |
|---------------------|------------------------------------------|
| `get_recent_commits`| Last N git commits (default 10)          |
| `get_current_diff`  | `git diff HEAD` output                   |
| `read_session_log`  | Contents of `mcp/.session_log.md`        |
| `read_file`         | Read any file within the repo root       |
| `list_files`        | List files in a directory (recursive)    |

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

| Variable      | Required | Description                        |
|---------------|----------|------------------------------------|
| `MCP_API_KEY` | Yes      | Bearer token for MCP server auth   |

Create a `.env` file in the repo root with these values before starting Docker.
