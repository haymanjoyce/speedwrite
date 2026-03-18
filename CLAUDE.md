# LogbookLM — Claude Code Context

## Project Overview

LogbookLM is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI chat, and markdown content.

## Repository Structure

```
logbooklm/
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── documents.py
│   ├── chat.py
│   ├── evidence.py
│   ├── models.py
│   └── storage.py
├── frontend/                         # React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Document.jsx
│       │   ├── Evidence.jsx
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       ├── components/
│       │   ├── TopBar.jsx
│       │   ├── Sidebar.jsx
│       │   ├── DocumentSidebar.jsx
│       │   ├── DocumentTree.jsx
│       │   ├── Editor.jsx
│       │   ├── ChatPanel.jsx
│       │   ├── EvidenceSidebar.jsx
│       │   ├── SourceDetail.jsx
│       │   └── AddSourceModal.jsx
│       └── api.js
├── nginx/
│   ├── local_app.conf
│   └── logbooklm.com.conf
├── docker-compose.yml
├── docker-compose.override.yml
├── bootstrap.sh
├── deploy.sh
└── CLAUDE.md
```

## Docker Stack

| Service    | Image / Build | Internal Port | Purpose                             |
|------------|---------------|---------------|-------------------------------------|
| `frontend` | `./frontend`  | —             | Build-only; copies /dist to volume  |
| `app`      | `./backend`   | 8000          | FastAPI backend (Python 3.12)       |
| `nginx`    | nginx:1.27    | 80, 443       | Reverse proxy + static file server  |

All services share an internal Docker bridge network. `docker-compose.override.yml` is automatically merged for local development (see below).

## App Architecture

Three main views:

1. **Library view** (`/`) — document list on the left, document detail on the right with Open, Evidence, and Delete buttons.
2. **Document view** (`/document/:id`) — document tree on the left, markdown editor in the middle, optional AI chat panel on the right (toggled from the top bar).
3. **Evidence view** (`/document/:id/evidence`) — source list on the left, source detail on the right.

## AI Features

- **Chat panel**: Chat mode (read-only responses) and Agent mode (can propose document changes). Selected editor text can be attached as context.
- **Evidence base**: Supports file uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, and plain text sources. All evidence is injected into AI chat context automatically.
- **Backend model**: `claude-sonnet-4-20250514` via Anthropic API. Key stored in `.env` as `ANTHROPIC_API_KEY`.

## Data Storage

JSON files on disk — no database.

| Path | Purpose |
|------|---------|
| `/var/logbooklm/users.json` | All user accounts |
| `/var/logbooklm/documents/{user_id}/{doc_id}.json` | Document data including content, evidence, and chat history |
| `/var/logbooklm/documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |

## Running Locally

```bash
cp .env.example .env   # populate JWT_SECRET and ANTHROPIC_API_KEY
docker compose up --build
```

- App: http://localhost
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

`docker-compose.override.yml` is automatically merged locally. It:
- Exposes the backend on port 8000
- Uses a local named volume instead of `/var/logbooklm`
- Replaces the nginx SSL config with a plain HTTP config
- Suppresses `nginx/default.conf` to avoid routing conflicts

## Deploying to Production

```bash
# First time only — run as root on a fresh Ubuntu 24.04 VPS
bash bootstrap.sh   # set EMAIL variable inside the script first

# Subsequent deploys
bash deploy.sh
```

## Key Commands

```bash
docker compose logs -f app       # backend logs
docker compose logs -f nginx     # nginx logs
docker compose restart app       # restart backend
docker compose up --build -d     # rebuild everything
docker compose ps                # container status
```
