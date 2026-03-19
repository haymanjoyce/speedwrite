# LogbookLM — Claude Code Context

## Project Overview

LogbookLM is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

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
│       │   ├── TopBar.jsx            # Global nav: breadcrumb + user/logout
│       │   ├── ContextBar.jsx        # Secondary nav: context-specific action pills
│       │   ├── Sidebar.jsx           # Unused — kept in repo
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

1. **Library view** (`/`) — document list on the left sidebar, document detail on the right. Context bar shows Open, Evidence, and Delete action pills when a document is selected.
2. **Document view** (`/document/:id`) — document tree on the left, markdown editor in the middle, AI agent chat panel always visible on the right. Context bar shows Evidence and Close pills; an "Add to chat" pill appears when editor text is selected.
3. **Evidence view** (`/document/:id/evidence`) — source list on the left, source detail on the right. Context bar shows Document, Delete (when a source is selected), and Close pills.

### Navigation

Every view has a two-tier navigation:
- **TopBar** — global: logo/breadcrumb, user email, logout.
- **ContextBar** — context-specific: action pills (rounded-full, gray-100) right-aligned, save status left-aligned. Primary sidebar actions (New Document, Add Source) are blue buttons inside sidebar headers.

## AI Features

- **Agent panel**: Always-on agent mode — the AI can propose document changes in response to any message. Proposed changes appear in the chat panel with Accept/Reject buttons. Accepting applies the change to the editor and triggers auto-save.
- **Context scoping**: When context is attached (selected editor text or a document section from the tree), the AI is instructed to change only that section and return the complete document with only that part replaced. When no context is attached, the AI can propose changes to the whole document.
- **Evidence base**: Supports file uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, and plain text sources. All evidence is injected into AI context automatically.
- **Backend model**: `claude-sonnet-4-20250514` via Anthropic API. Key stored in `.env` as `ANTHROPIC_API_KEY`.

## Document Tree

- Hovering a tree node highlights that node and all its child nodes (bg-blue-50).
- An "Add" button appears on hover; clicking it extracts all content under that heading (up to the next equal/higher level heading) and sets it as chat context.
- Clicking the heading text scrolls the editor to that heading (via `useImperativeHandle` on Editor).

## Chat Panel

- Single agent mode — no chat/agent toggle.
- Context chip shows attached text; dismissed with ×.
- Chat history is loaded once on mount from the persisted document and never reloaded on subsequent document updates (prevents proposed changes from being overwritten).
- Proposed changes block is shown when the AI returns `<proposed_document>` tags; dismissed permanently on Accept or Reject.

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
