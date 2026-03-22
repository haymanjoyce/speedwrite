# SpeedWrite — Claude Code Context

## Project Overview

SpeedWrite is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

## Repository Structure

```
speedwrite/
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── documents.py
│   ├── chat.py
│   ├── evidence.py
│   ├── actions.py
│   ├── embeddings.py
│   ├── llm.py           # Unified LLM abstraction (Anthropic + Ollama)
│   ├── config.py        # GET /config endpoint (exposes server-side defaults)
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
│       │   ├── ProviderToggle.jsx    # Segmented pill to switch between Anthropic and Ollama
│       │   ├── SegmentedControl.jsx  # Reusable segmented pill control (options, value, onChange)
│       │   ├── EvidenceSidebar.jsx
│       │   ├── SourceDetail.jsx
│       │   └── AddSourceModal.jsx
│       └── api.js
├── nginx/
│   ├── local_app.conf
│   └── speedwrite.app.conf
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

The nginx `/api/` location block sets `proxy_read_timeout 300s`, `proxy_send_timeout 300s`, and `proxy_connect_timeout 10s` to handle slow Ollama inference without gateway timeouts.

## App Architecture

Three main views:

1. **Library view** (`/`) — document list on the left sidebar, document detail on the right. Context bar shows Open, Evidence, and Delete action pills when a document is selected.
2. **Document view** (`/document/:id`) — document tree on the left, markdown editor in the middle, AI agent chat panel always visible on the right. Context bar shows Actions (dropdown), Evidence, Log, and Close pills; "Add to chat" appears when editor text is selected. An Actions dropdown and Edit/Preview segmented control are rendered as `controls` on the right of the context bar. When a diff action is selected, an InstructionBar appears below the context bar. When the AI proposes a change, the editor is replaced by an inline diff view and the context bar shows only Accept and Reject pills.
3. **Evidence view** (`/document/:id/evidence`) — source list on the left, source detail on the right. Context bar shows Document, Log, Reindex, Sync now (when a document-type source is selected and sync=off), Delete (when a source is selected), and Close pills.
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
- **Rewrite button**: Each document tree node shows a "Rewrite" button on hover. Clicking it calls the chat API directly from `Document.jsx` with `ignore_history: true` (so prior chat history is excluded), sends "Rewrite this section." as the message with the section as context, and sets the pending proposal when a response arrives. The exchange is appended to the chat panel via `chatPanelRef.current.appendMessages(...)`.
- **Context scoping**: When context is attached (selected editor text, a section from the attachment popup, or an evidence source), the AI is instructed to change only that section and return the complete document with only that part replaced. When no context is attached, the AI can propose changes to the whole document. `ignore_history: bool` on `ChatRequest` skips chat history when context is attached (ensuring a fresh response uninfluenced by prior conversation) and for Rewrite button calls.
- **Evidence base**: Supports file uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, and other documents as sources. All evidence is injected into AI context automatically. Document-type sources have a sync toggle: sync=on fetches live content from the source document at chat time; sync=off uses a stored snapshot. "Sync now" (context bar) manually refreshes the snapshot (only available when sync=off).
- **Embeddings and RAG**: Evidence sources are chunked (2000 chars, 200 overlap) and embedded via Ollama (`nomic-embed-text`) in background threads. Embeddings stored at `{DATA_DIR}/embeddings/{user_id}/{doc_id}.json`. At chat/action time, if total non-live evidence content exceeds 8000 characters and embeddings exist, top-5 semantically relevant chunks are retrieved (cosine similarity, no threshold) instead of the full dump. Live sync-on document sources are always included directly. If Ollama is unavailable, falls back to full truncated dump silently. `POST /documents/{doc_id}/evidence/reindex` triggers a fire-and-forget reindex of all eligible sources. Implemented in `backend/embeddings.py` (pure Python, no numpy). Per-document threading locks prevent race conditions during concurrent indexing. `OLLAMA_HOST` env var configures the Ollama endpoint.
- **Document actions**: Whole-document AI actions accessible via the Actions dropdown in the context bar. Chat-output actions (Summarise, Extract key points) append results directly to the chat panel. Diff-producing actions (Rewrite, Restructure, Expand, Condense) show an InstructionBar for optional instructions, then set `pendingProposal` to trigger the diff view. Implemented in `backend/actions.py` (`POST /documents/{doc_id}/action`). `Home.jsx` description generation reuses the `summarise` action.
- **Content override safety**: `editorContentOverride` in `Document.jsx` is a one-shot signal. After `Editor.jsx` applies it, `onContentOverrideApplied` fires immediately to clear it back to `null`, preventing re-application on subsequent renders.
- **LLM abstraction layer**: All LLM calls are routed through `backend/llm.py` (`complete()` → `_complete_anthropic` or `_complete_ollama`). The active provider is controlled by the `LLM_PROVIDER` env var (default: `anthropic`). Ollama is fully supported as an alternative provider. `_complete_ollama` uses `httpx.Timeout(connect=10.0, read=300.0, write=30.0, pool=10.0)` and raises `HTTPException` on `ConnectError` (503), `ReadTimeout` (504), and other errors (500) with descriptive messages. The `provider` field in chat/action request bodies can override the env var per-request.
- **Provider toggle UI**: `ProviderToggle.jsx` exists and uses `SegmentedControl` to switch between Anthropic and Ollama. It is not currently exposed in the Document view — reserved for a future enterprise/self-hosted tier. The underlying backend and `api.js` plumbing remains intact.
- **Backend model**: Anthropic path uses `claude-sonnet-4-20250514`. Ollama path uses `OLLAMA_CHAT_MODEL` env var (default: `llama3.2`). Anthropic API key stored in `.env` as `ANTHROPIC_API_KEY`.
- **Token limits**: `chat.py` and `actions.py` both use `max_tokens=4096` to prevent truncated `<proposed_document>` responses. Known limitation: very large attachments (sections or evidence sources) can still cause truncation if the combined prompt + response exceeds the model's context window. Workaround: attach smaller sections rather than entire large documents. Future fix: streaming responses or context summarisation.

## Document Tree

- Hovering a tree node highlights that node and all its child nodes (bg-blue-50).
- Two buttons appear on hover: **Add** (sets section as chat context chip) and **Rewrite** (triggers an immediate AI rewrite of that section, bypassing chat history). Rewrite is hidden for protected headings.
- Protected headings shown with `bg-gray-100` background and a lock icon (🔒). Lock icon for unlocked headings shown faintly on hover only.
- Clicking the heading text scrolls the editor to that heading (via `useImperativeHandle` on Editor).
- When the document has no `##` headings, `DocumentSidebar.jsx` shows a placeholder: "No structure yet. Add ## headings to build a document tree." `parseHeadings` is exported from `DocumentTree.jsx` for use by the sidebar.
- `SegmentedControl.jsx` is used for the Edit/Preview toggle in `Document.jsx` and internally by `ProviderToggle.jsx`. Styling matches `ContextBar` action pills exactly (text-xs, px-3 py-0.5, rounded-full).

## Chat Panel

- Single agent mode — no chat/agent toggle.
- Context chip shows attached text; dismissed with ×.
- Chat history is loaded (and reset) whenever `document?.id` changes. This fires once per document, so mid-conversation saves (which update the document prop without changing its ID) do not overwrite in-flight messages. On load, a `setTimeout(..., 0)` scrolls to the bottom after the DOM updates.
- **Note on double fetches in development**: `React.StrictMode` is enabled in `main.jsx`. In React 18 development mode, this intentionally mounts → unmounts → remounts every component, causing each effect to fire twice. Two `GET /documents/:id` requests on page load is expected behaviour in dev and does not happen in production builds.
- When the AI returns `<proposed_document>` tags, the extracted content is passed to `Document.jsx` via `onProposedChange`. The chat panel only ever shows the explanation text — proposed content is never rendered inside the chat.
- `ChatPanel` is a `forwardRef` component. It exposes `appendMessages(userMsg, assistantMsg)` via `useImperativeHandle` so `Document.jsx` can inject messages (e.g. after a Rewrite or Reject). If `userMsg` is `null`, only the assistant message is appended.
- Enter key behaviour is user-configurable: "↵ on" sends on Enter (Shift+Enter for newline); "↵ off" reverts to Ctrl/Cmd+Enter only. Preference persisted in `localStorage` as `logbooklm_submit_on_enter` (key kept as-is for backwards compatibility with existing user preferences).
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
| `/var/speedwrite/users.json` | All user accounts |
| `/var/speedwrite/documents/{user_id}/{doc_id}.json` | Document data including content, evidence, chat history, audit log, and protected sections |
| `/var/speedwrite/documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |
| `/var/speedwrite/embeddings/{user_id}/{doc_id}.json` | Chunked embeddings for all evidence sources in a document |

> **Note**: The canonical data directory is `/var/speedwrite`. The existing VPS deployment and local dev Docker volume (`dev_logbooklm_data`) still mount to `/var/logbooklm` — migrate by updating the volume mount and `DATA_DIR` env var when provisioning a fresh VPS.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |
| `LLM_PROVIDER` | Default LLM provider: `anthropic` (default) or `ollama` |
| `OLLAMA_HOST` | Ollama base URL for both embeddings and chat (default: `http://host.docker.internal:11434`) |
| `OLLAMA_CHAT_MODEL` | Ollama model for chat completions (default: `llama3.2`) |

## Ollama Setup (for local LLM and/or embeddings)

Ollama runs outside Docker on the host machine. The Docker container reaches it via `host.docker.internal`.

```bash
# Install Ollama: https://ollama.com
ollama pull nomic-embed-text   # required for embeddings/RAG
ollama pull llama3.2           # required if LLM_PROVIDER=ollama
```

Set in `.env`:
```
LLM_PROVIDER=ollama            # optional — omit to keep Anthropic for chat
OLLAMA_CHAT_MODEL=llama3.2     # optional — defaults to llama3.2
OLLAMA_HOST=http://host.docker.internal:11434   # default, no change needed on Mac/Linux
```

Embeddings are always attempted via Ollama regardless of `LLM_PROVIDER`. If Ollama is unreachable, the embedding step is skipped silently and RAG falls back to a full context dump.

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
- Uses a local named volume (`dev_logbooklm_data`) mounted at `/var/logbooklm` instead of the host path
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
