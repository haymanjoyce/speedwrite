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
│   ├── actions.py
│   ├── log.py
│   ├── models.py
│   └── storage.py
├── frontend/                         # React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Document.jsx
│       │   ├── Evidence.jsx
│       │   ├── Log.jsx
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       ├── components/
│       │   ├── TopBar.jsx            # Global nav: breadcrumb + user/logout
│       │   ├── ContextBar.jsx        # Secondary nav: context-specific action pills
│       │   ├── Sidebar.jsx           # Unused — kept in repo
│       │   ├── Button.jsx            # Reusable button (variant: primary/secondary/danger/ghost; size: sm/md)
│       │   ├── DocumentSidebar.jsx
│       │   ├── DocumentTree.jsx
│       │   ├── Editor.jsx
│       │   ├── DiffView.jsx          # LCS-based inline diff renderer (replaces editor when proposal pending)
│       │   ├── MarkdownPreview.jsx   # Custom markdown renderer for Preview mode (no external deps)
│       │   ├── ChatPanel.jsx
│       │   ├── ActionsDropdown.jsx   # Actions pill + dropdown menu for document-level AI actions
│       │   ├── InstructionBar.jsx    # Slim bar below context bar for optional action instructions
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
2. **Document view** (`/document/:id`) — document tree on the left, markdown editor in the middle, AI agent chat panel always visible on the right. Context bar shows Actions (dropdown), Evidence, Log, and Close pills; "Add to chat" appears when editor text is selected. An Edit/Preview segmented control and the Actions dropdown are rendered as `controls` on the right of the context bar. When a diff action is selected, an InstructionBar appears below the context bar. When the AI proposes a change, the editor is replaced by an inline diff view and the context bar shows only Accept and Reject pills.
3. **Evidence view** (`/document/:id/evidence`) — source list on the left, source detail on the right. Context bar shows Document, Log, Sync now (when a document-type source is selected and sync=off), Delete (when a source is selected), and Close pills.
4. **Log view** (`/document/:id/log`) — audit log entries newest-first on the left, entry detail on the right. Context bar shows Document, Evidence, and Close pills.

### Navigation

Every view has a two-tier navigation:
- **TopBar** — global: logo/breadcrumb, user email, logout.
- **ContextBar** — context-specific: action pills (rounded-full, gray-100) right-aligned, save status left-aligned. Primary sidebar actions (New Document, Add Source) are blue buttons inside sidebar headers.

## AI Features

- **Agent panel**: Always-on agent mode — the AI can propose document changes in response to any message. When the AI returns a `<proposed_document>` block, the editor is replaced by an inline diff view (via `DiffView.jsx`). The context bar switches to Accept/Reject pills with "Reviewing changes…" status. Accepting applies the change to the editor and triggers auto-save; rejecting discards it and appends "Changes rejected." to the chat.
- **Inline diff view**: LCS-based line diff rendered in `DiffView.jsx`. Removed lines shown in red with strikethrough; added lines in green. Equal lines shown normally. The diff occupies the same flex slot as the editor.
- **Edit/Preview toggle**: Segmented pill control in the context bar switches between the raw markdown textarea (`edit`) and `MarkdownPreview.jsx` (`preview`). When a diff is pending, the toggle is hidden and DiffView always shows regardless of mode.
- **Markdown preview**: `MarkdownPreview.jsx` is a custom renderer (no external deps) supporting h1–h3, bold, italic, inline code, fenced code blocks, unordered lists, paragraphs, and URLs.
- **Rewrite button**: Each document tree node shows a "Rewrite" button on hover alongside "Add". Clicking it calls the chat API directly from `Document.jsx` with `ignore_history: true` (so prior chat history is excluded), sends "Rewrite this section." as the message with the section as context, and sets the pending proposal when a response arrives. The exchange is appended to the chat panel via `chatPanelRef.current.appendMessages(...)`.
- **Context scoping**: When context is attached (selected editor text or a document section from the tree), the AI is instructed to change only that section and return the complete document with only that part replaced. When no context is attached, the AI can propose changes to the whole document. `ignore_history: bool` on `ChatRequest` lets callers skip chat history for fresh rewrites.
- **Evidence base**: Supports file uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, and other documents as sources. All evidence is injected into AI context automatically. Document-type sources have a sync toggle: sync=on fetches live content from the source document at chat time; sync=off uses a stored snapshot. "Sync now" (context bar) manually refreshes the snapshot (only available when sync=off).
- **Document actions**: Whole-document AI actions accessible via the Actions dropdown in the context bar. Chat-output actions (Summarise, Extract key points) append results directly to the chat panel. Diff-producing actions (Rewrite, Restructure, Expand, Condense) show an InstructionBar for optional instructions, then set `pendingProposal` to trigger the diff view. Implemented in `backend/actions.py` (`POST /documents/{doc_id}/action`). `Home.jsx` description generation reuses the `summarise` action.
- **Content override safety**: `editorContentOverride` in `Document.jsx` is a one-shot signal. After `Editor.jsx` applies it, `onContentOverrideApplied` fires immediately to clear it back to `null`, preventing re-application on subsequent renders.
- **Backend model**: `claude-sonnet-4-20250514` via Anthropic API. Key stored in `.env` as `ANTHROPIC_API_KEY`.

## Document Tree

- Hovering a tree node highlights that node and all its child nodes (bg-blue-50).
- Two buttons appear on hover: **Add** (sets section as chat context chip) and **Rewrite** (triggers an immediate AI rewrite of that section, bypassing chat history). Rewrite is hidden for protected headings.
- Protected headings shown with `bg-gray-100` background and a lock icon (🔒). Lock icon for unlocked headings shown faintly on hover only.
- Clicking the heading text scrolls the editor to that heading (via `useImperativeHandle` on Editor).

## Chat Panel

- Single agent mode — no chat/agent toggle.
- Context chip shows attached text; dismissed with ×.
- Chat history is loaded once on mount from the persisted document and never reloaded on subsequent document updates (prevents in-flight messages from being overwritten by auto-save triggers).
- When the AI returns `<proposed_document>` tags, the extracted content is passed to `Document.jsx` via `onProposedChange`. The chat panel only ever shows the explanation text — proposed content is never rendered inside the chat.
- `ChatPanel` is a `forwardRef` component. It exposes `appendMessages(userMsg, assistantMsg)` via `useImperativeHandle` so `Document.jsx` can inject messages (e.g. after a Rewrite or Reject). If `userMsg` is `null`, only the assistant message is appended.
- Enter key behaviour is user-configurable: "↵ on" sends on Enter (Shift+Enter for newline); "↵ off" reverts to Ctrl/Cmd+Enter only. Preference persisted in `localStorage` as `logbooklm_submit_on_enter`.
- A "↓ Latest" button appears between the messages area and the input when the user has scrolled more than 100px from the bottom. Auto-scroll only fires when already near the bottom.

## Audit Log

- Append-only log stored as `audit_log` array on each document JSON.
- `append_audit_log(doc, event, detail)` helper in `storage.py` creates a UUID entry and appends it.
- Events: `document_created`, `document_edited`, `rewrite_accepted`, `rewrite_rejected`, `evidence_added`, `evidence_deleted`, `document_deleted`.
- `GET /documents/{doc_id}/log` returns entries newest-first. `POST /documents/{doc_id}/log` appends a manual entry.
- Log view (`/document/:id/log`) in `Log.jsx` — left panel lists entries, right panel shows selected entry detail.

## Section Locking

- `protected_sections: list` on each document stores locked heading texts.
- Backend enforces via system prompt in `chat.py` (`_build_protected_block`) — AI instructed never to modify locked sections and never to offer to unlock them.
- `POST /documents/{doc_id}/protect` adds a heading; `DELETE /documents/{doc_id}/protect` removes one.
- Frontend: optimistic update in `Document.jsx` with error revert. `DocumentTree.jsx` shows lock icons and applies `bg-gray-100` to protected nodes.
- `MarkdownPreview.jsx` and `DiffView.jsx` both highlight protected blocks visually.

## Data Storage

JSON files on disk — no database.

| Path | Purpose |
|------|---------|
| `/var/logbooklm/users.json` | All user accounts |
| `/var/logbooklm/documents/{user_id}/{doc_id}.json` | Document data including content, evidence, chat history, audit log, and protected sections |
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
