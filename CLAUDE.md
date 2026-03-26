# SpeedWrite — Claude Code Context

## Project Overview

SpeedWrite is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

## Intentional Removals

### Audit Log removed (do not re-add)

The Audit Log feature (`log.py`, `Log.jsx`, `append_audit_log`, `addLogEntry`, `/document/:id/log` route) was removed intentionally. It is an audit trail, not a user-facing document authoring feature. The Log concept belongs in a separate product (LogbookLM), which will be built later as a fork of SpeedWrite. Do not re-add audit logging or a Log tab to SpeedWrite.

Existing `audit_log` arrays in document JSON files are harmless and simply ignored.

## Design Decisions

### Rewrite operates at section level, not selected-text level

The Rewrite button lives on tree node hover and operates on the full section under a heading, not on arbitrary selected text.

**Why:** We experimented with adding a Rewrite pill to the context bar that fired when the user selected text in the editor. This was reverted because:

1. LLMs are unreliable at precise mid-paragraph text substitution — asking the model to find and replace an exact sentence within a larger document produces inconsistent results
2. Section-level rewrites work reliably because the heading provides an unambiguous boundary — the AI knows exactly what to replace
3. For sentence-level edits, the chat panel (attach text as context, ask for suggestions) is a better workflow — the user sees the suggestion in chat and applies it manually

**Implication:** Do not add Rewrite to the context bar for text selections. If sentence-level rewriting is needed in future, it should be implemented via backend text substitution (AI rewrites only the selected text, backend does the replacement) rather than asking the AI to return a full document with the replacement embedded.

## UI Conventions

### Three-tier navigation hierarchy

**Tier 1 — Global bar (TopBar):** Always visible. App name/logo, breadcrumb, search icon, user email, logout. Breadcrumb shows "SpeedWrite" (→ /) and document title when open — no sub-page labels in breadcrumb. Props: `user`, `onLogout`, `docTitle`, `isRenaming`, `onRenameSave`, `onRenameCancel`.

**Tier 2 — Page context bar (ContextBar):** Below the global bar. Left side: tab navigation (Document / Evidence / History); active tab `text-gray-900 font-semibold`, inactive `text-gray-400`. Right side: page-specific action buttons (outlined). ContextBar accepts a `tabs` prop: `[{ label, active, onClick }]`.
- Library (doc selected): no tabs · right: Open (primary) · Rename · Delete
- Document: tabs (Document active) · right: Add to chat (conditional) · Save version · Rename · Save as template · Export .txt · Export PDF · Close; tabs replaced with Accept · Reject when proposal pending
- Evidence: tabs (Evidence active) · right: Reindex (hidden when no sources) · Sync now (conditional) · Delete (conditional) · Close

**Tier 3 — Panel headers:** Slim headers (h-11, bg-white, border-b). Label text-xs font-semibold text-gray-500 uppercase tracking-wide, left-aligned. Panel-specific actions right-aligned in header or below it.

### Control type rules

- **Outlined buttons** (ContextBar, Tier 2): navigation actions, page-level CRUD, toggle states (Accept/Reject, Add to chat). Primary variant = blue; danger variant = red.
- **Buttons** (panel headers or below): panel CRUD actions (Add Source, New Document). Full-width for primary panel action. Use `Button.jsx` with `variant='primary'/'secondary'`.
- **Segmented controls** (`SegmentedControl.jsx`): mutually exclusive mode switches in a panel header. Example: Edit/Preview in Editor.
- **Dropdowns** (`ActionsDropdown.jsx`): grouped AI/transform actions in a panel header. Open downward, right-aligned (`right-0`).

### General principles
- Labels left, actions right — they never compete
- Destructive actions (Delete) always red; primary actions (Add, New) always blue
- The further down the tier, the more specific the action scope

### No-modal rule
The app avoids modals — actions happen inline or in panels. The **one intentional exception** is `SearchOverlay.jsx` (global search). Do not add further modals without equally strong justification.

### Delete confirmations
Destructive deletes use an inline confirmation bar below the context bar (`bg-red-50 border-red-100`), not `window.confirm()`. Warning text left, Delete + Cancel buttons right. Escape/Cancel dismisses. `pendingDelete` boolean controls visibility; cleared on selection change and on success. Applies to: document delete (`Home.jsx`) and evidence delete (`Evidence.jsx`).

## Repository Structure

```
speedwrite/
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── documents.py
│   ├── chat.py
│   ├── evidence.py
│   ├── evidence_chat.py
│   ├── actions.py
│   ├── embeddings.py
│   ├── llm.py
│   ├── search.py
│   ├── templates.py
│   ├── export.py
│   ├── models.py
│   └── storage.py
├── frontend/
│   └── src/
│       ├── context/
│       │   └── SearchContext.jsx
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Document.jsx
│       │   ├── Evidence.jsx
│       │   ├── History.jsx
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       ├── components/
│       │   ├── TopBar.jsx
│       │   ├── ContextBar.jsx
│       │   ├── Sidebar.jsx          # Unused — kept in repo
│       │   ├── Button.jsx
│       │   ├── DocumentSidebar.jsx
│       │   ├── DocumentTree.jsx
│       │   ├── Editor.jsx
│       │   ├── DiffView.jsx
│       │   ├── MarkdownPreview.jsx
│       │   ├── ChatPanel.jsx
│       │   ├── AttachmentPopup.jsx
│       │   ├── ActionsDropdown.jsx
│       │   ├── InstructionBar.jsx
│       │   ├── SegmentedControl.jsx
│       │   ├── ErrorBoundary.jsx
│       │   ├── SearchOverlay.jsx
│       │   ├── TemplatePickerOverlay.jsx
│       │   ├── EvidenceChatPanel.jsx
│       │   ├── EvidenceSidebar.jsx
│       │   ├── SourceDetail.jsx
│       │   └── AddSourceModal.jsx
│       ├── constants/
│       │   └── attachmentLimits.js   # ATTACHMENT_TRUNCATION_LIMIT and ATTACHMENT_WARNING_THRESHOLD (both 6000)
│       ├── insightPrompts.js         # SHARED_INSIGHT_ACTIONS shared by ChatPanel and EvidenceChatPanel
│       ├── data/
│       │   └── templates.js          # BUILT_IN_TEMPLATES (5 built-in templates)
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

`docker-compose.override.yml` is auto-merged locally. It exposes the backend on 8000, uses a local named volume, replaces SSL config with plain HTTP, and suppresses `nginx/default.conf`. The nginx `/api/` location sets `proxy_read_timeout 300s` to handle slow Ollama inference.

## App Architecture

Four main views:

1. **Library** (`/`) — document list left, document detail right. ContextBar: Open · Rename · Delete when a doc is selected.
2. **Document** (`/document/:id`) — tree left, editor middle, AI chat right. ContextBar: Document tab + Save version · Rename · Save as template · Export .txt · Export PDF · Close; switches to Accept · Reject during diff review. Redraft and Insights dropdowns live in the ChatPanel header. Edit/Preview segmented control lives in the Editor panel header.
3. **Evidence** (`/document/:id/evidence`) — source list (260px) left, source detail (flex-1) middle, EvidenceChatPanel (380px) right.
4. **History** (`/document/:id/history`) — snapshot list left, snapshot detail + MarkdownPreview right.

`ErrorBoundary.jsx` wraps the router and each page route in `App.jsx` — two levels, so a crash in one page doesn't block navigation.

## AI Features

- **Agent panel**: AI can propose document changes in any message. `<proposed_document>` block triggers diff view. Chat panel is hidden via `display: none` (not unmounted) so ref and chat state survive the reject path — `className={pendingProposal ? 'hidden' : 'contents'}`.
- **Inline diff** (`DiffView.jsx`): LCS-based. Removed = red strikethrough; added = green; equal = muted gray. Auto-scrolls to first change on mount. Occupies the same flex slot as the editor.
- **Rewrite button**: On tree node hover. Calls `chatPanelRef.current.prefillRewrite(sectionContent, headingText)` in `Document.jsx` — pre-fills input with section as context and "Rewrite this section.", focuses textarea so user can edit before sending.
- **Context scoping**: When context is attached, AI is instructed to change only that section and return the full document with only that part replaced. `ignore_history: true` is set whenever context is attached.
- **Content override safety**: `editorContentOverride` in `Document.jsx` is a one-shot signal. `onContentOverrideApplied` fires immediately after `Editor.jsx` applies it to clear it back to `null`.
- **Document actions routing (important)**: Redraft actions in `ChatPanel` go through `fireInsightInternal` → `handleSend` → `api.chatMessage` → `chat.py`. They do **NOT** call `api.documentAction` / `actions.py`. Only `Home.jsx` description generation calls `api.documentAction`.
- **Redraft vs Insights**: Both dropdowns in ChatPanel header, both disabled when `pendingProposal` is truthy. Redraft shows `InstructionBar` for optional instructions before firing. Insights fire immediately. Both use `SHARED_INSIGHT_ACTIONS` from `insightPrompts.js`.
- **Evidence base**: File uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, other documents. URL sources carry `last_fetched_at` and `last_fetch_error`. `POST .../evidence/{id}/refresh` updates content and re-embeds on success. "Update sources" in Sources panel header runs all URL sources sequentially. Duplicate URL detection shows amber banner in SourceDetail.
- **Embeddings/RAG**: Chunked (2000 chars, 200 overlap), embedded via Ollama `nomic-embed-text`. At chat time, if total non-live evidence > 8000 chars and embeddings exist, top-5 chunks retrieved (cosine similarity) instead of full dump. Per-source RAG preflight in ChatPanel/EvidenceChatPanel: `api.ragQuery` → `POST .../evidence/{id}/rag-query`; if `used_rag: true`, chunks replace context. Falls back silently if Ollama unreachable.
- **LLM abstraction** (`llm.py`): `complete()` routes to `_complete_anthropic` or `_complete_ollama`. Anthropic is the only active path. `_complete_ollama()` is retained but dormant — no UI toggle and `LLM_PROVIDER`/`OLLAMA_CHAT_MODEL` are commented out in `.env.example`. `config.py` and `ProviderToggle.jsx` have been deleted. Anthropic model: `claude-sonnet-4-20250514`.
- **Evidence chat** (`EvidenceChatPanel.jsx`): Persistent chat on Evidence page. "All sources" option concatenates all sources. `ignore_history: true` when context attached. Backend: `POST /documents/{doc_id}/evidence-chat` in `evidence_chat.py`. Never modifies the document.
- **Token limits**: `max_tokens=4096` in `chat.py` and `actions.py`. Large attachments can still cause truncation if total prompt + response exceeds model context window.
- **Document templates**: Built-in templates in `frontend/src/data/templates.js`. User templates at `/var/speedwrite/templates/{user_id}/{template_id}.json` via `backend/templates.py`. `TemplatePickerOverlay.jsx` two screens: grid picker → AI pre-fill step. `POST /templates/prefill` calls `llm.complete()` (max_tokens=2048). "Save as template" opens inline bar (same `activeBar` state slot as other inline bars).
- **Document export**: `GET .../export/txt` strips markdown to plain text. `GET .../export/pdf` uses `markdown` Python lib + `weasyprint`. Both auth-required, filename-sanitised, `Content-Disposition: attachment`. Frontend: `api.downloadExport` fetches as blob, extracts filename from header, triggers download via temporary `<a>`. Dockerfile apt packages: `libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b shared-mime-info fonts-liberation`.
- **Global search**: `POST /search` substring search across all user docs (titles, content, evidence, chat history — not evidence_chat_history). Returns ≤5 per group. Frontend: `SearchOverlay.jsx` triggered by Cmd/Ctrl+K or search icon. 300ms debounce. Evidence results navigate to Evidence view with `{ state: { evidenceId } }`; `Evidence.jsx` pre-selects on load via `initialSelectDoneRef` (one-shot).

## Document Tree

- Hover highlights node + all children (`bg-blue-50`).
- **Rewrite** button on hover (hidden for protected headings). Former "Add" button removed — use + in chat input.
- Protected headings: `bg-gray-100` + lock icon. Unlocked headings show lock icon faintly on hover only.
- Clicking heading scrolls editor to it via `useImperativeHandle` on Editor.
- No `##` headings → DocumentSidebar shows placeholder. `parseHeadings` is exported from `DocumentTree.jsx`.

## Chat Panel

- **Attachment**: `AttachmentPopup.jsx` (+ button). Section picker uses `parseHeadingsWithContent` from `Document.jsx`; evidence picker uses `doc.evidence`. Popup closes on outside click (anchor-ref-aware) or Escape.
- **Context chip**: shows label + char count. Amber styling + `⚠` when truncated. Hard truncation at 6000 chars (`ATTACHMENT_TRUNCATION_LIMIT`), amber warning threshold also 6000. `originalLength` stored pre-truncation. `AttachmentPopup` passes raw content — truncation all happens in `ChatPanel`.
- **Context priority**: `localContext` (popup) takes priority over `contextText` prop (editor selection). `contextText` being set clears `localContext`. Both cleared on send.
- **Context label**: stored in `chat_history` as `context_label` on user entries. User messages with a label show a small tag above the bubble, right-aligned.
- **forwardRef**: `ChatPanel` exposes `appendMessages(userMsg, assistantMsg)` and `prefillRewrite(content, heading)` via `useImperativeHandle`.
- **Stop button**: replaces Send while request in flight. Calls `AbortController.abort()`; `AbortError` caught silently. `api.js` `request()` accepts optional `signal`.
- **Enter key**: configurable. `localStorage` key is `logbooklm_submit_on_enter` (kept as-is for backwards compatibility). Send button uses `onClick={() => handleSend()}` — not `onClick={handleSend}` — to prevent the click event being passed as `textOverride`.
- **RAG badge**: `✦ RAG` appears near Stop button when per-source RAG is active. Cleared in `finally` and by Stop handler.
- **Double fetches in dev**: React 18 StrictMode causes intentional double-mount. Two `GET /documents/:id` on load is expected in dev, not a bug.

## Document History

- Snapshots: `history: list` on doc JSON; max 50 (oldest dropped).
- `save_count` incremented on every PUT; snapshot taken when `save_count % 10 == 0`.
- Four triggers: `auto` ("Auto save"), `rewrite` ("AI rewrite"), `restore` ("Version restored"), `manual` ("Manual checkpoint").
- `POST /documents/{doc_id}/snapshot` — body `{ label, trigger }`. Returns new entry.
- `GET /documents/{doc_id}/history` — list newest-first, **no** `content` field.
- `GET /documents/{doc_id}/history/{snapshot_id}` — full snapshot with content.
- Restore flow: History.jsx navigates to `/document/:id` with `{ state: { restoreContent, restoreSnapshotId, restoreSnapshotLabel } }`. `Document.jsx` reads this on load, sets `pendingProposal`, sets `pendingProposalReason: 'restore'`, clears location state via `window.history.replaceState`. Accept → `trigger='restore'` snapshot created; Reject → unchanged.
- `pendingProposalReason`: `'ai_rewrite'` (default) or `'restore'`. Controls snapshot trigger in `handleAccept`. Reset to `'ai_rewrite'` after accept.
- `flashStatus` prop on `Editor.jsx`: shows brief messages ("Version saved", "Template saved") in Editor header, overriding save status for 3 seconds.

## Section Locking

- `protected_sections: list` on doc stores locked heading texts.
- Backend enforces via system prompt in `chat.py` (`_build_protected_block`) — AI instructed never to modify or offer to unlock locked sections.
- `POST /documents/{doc_id}/protect` adds; `DELETE` removes.
- Frontend: optimistic update with error revert in `Document.jsx`. `DocumentTree.jsx` shows lock icons, `bg-gray-100` on protected nodes. `MarkdownPreview.jsx` and `DiffView.jsx` both highlight protected blocks visually.

## Structure Locking

Separate and independent from per-section locking. Prevents AI from changing document structure (add/remove/reorder/rename sections) while allowing content rewrites.

- `structure_locked: bool` on doc (default `False`). `doc.get('structure_locked', False)` for existing docs.
- `POST /documents/{doc_id}/lock-structure` and `POST .../unlock-structure`.
- Instruction text injected into `chat.py` `scope_instruction` and `actions.py` system prompt: *"The document structure is locked. Do not add, remove, reorder, or rename any sections. Rewrite the content within sections freely, except where individual sections are also locked. Locks are constraints — always proceed with the rewrite, doing as much as permitted."*
- UI: icon-only 🔒/🔓 toggle in Structure panel header. No visual treatment on tree nodes — avoids collision with per-section lock styling.
- When `structureLocked` is true, heading lines highlighted in `DiffView` (`~` gutter, `bg-gray-100`, `border-l-2 border-gray-300`) and `MarkdownPreview` (`bg-gray-50 border-l-2 border-gray-200 pl-4`). `DiffView` matches `/^#{1,6}\s/` lines.
- `ChatPanel` receives and forwards `structureLocked` on every message (including Redraft actions, which route through `handleSend`).

## Data Storage

JSON files on disk — no database.

| Path | Purpose |
|------|---------|
| `/var/speedwrite/users.json` | All user accounts |
| `/var/speedwrite/documents/{user_id}/{doc_id}.json` | Document data: content, evidence, chat history, protected sections, version history, save_count |
| `/var/speedwrite/documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |
| `/var/speedwrite/embeddings/{user_id}/{doc_id}.json` | Chunked embeddings for all evidence sources |
| `/var/speedwrite/templates/{user_id}/{template_id}.json` | User-saved templates |

> **Note**: Canonical data dir is `/var/speedwrite`. Existing VPS and local dev volume (`dev_logbooklm_data`) still mount to `/var/logbooklm` — update volume mount and `DATA_DIR` env var when provisioning fresh.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing secret |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OLLAMA_HOST` | Ollama base URL (default: `http://host.docker.internal:11434`) — used for embeddings only |
| `LLM_PROVIDER` | Dormant — commented out in `.env.example`. Set to `ollama` to activate Ollama chat path. |
| `OLLAMA_CHAT_MODEL` | Dormant — commented out in `.env.example`. Ollama chat model (default `llama3.2`). |

## Ollama Setup

Ollama runs outside Docker; reached via `host.docker.internal`.

```bash
ollama pull nomic-embed-text   # required for embeddings/RAG
ollama pull llama3.2           # only needed if reactivating Ollama chat (dormant)
```

Embeddings always attempted via Ollama regardless of `LLM_PROVIDER`. If unreachable, skipped silently and RAG falls back to full context dump.

## Running Locally

```bash
cp .env.example .env   # populate JWT_SECRET and ANTHROPIC_API_KEY
docker compose up --build
```

- App: http://localhost · Backend API: http://localhost:8000 · Docs: http://localhost:8000/docs

## Deploying to Production

```bash
bash bootstrap.sh   # first time only — set EMAIL inside the script first
bash deploy.sh      # subsequent deploys
```

## Key Commands

```bash
docker compose logs -f app       # backend logs
docker compose logs -f nginx     # nginx logs
docker compose restart app       # restart backend
docker compose up --build -d     # rebuild everything
docker compose ps                # container status
```
