# SpeedWrite — Claude Code Context

## Project Overview

SpeedWrite is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

## Intentional Removals

### Audit Log removed (do not re-add)

The Audit Log feature (`log.py`, `Log.jsx`, `append_audit_log`, `addLogEntry`, `/document/:id/log` route) was removed intentionally. It is an audit trail, not a user-facing document authoring feature. The Log concept is out of scope for SpeedWrite. Do not re-add audit logging or a Log tab to SpeedWrite.

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

**Tier 1 — Global bar (TopBar):** Always visible. App name/logo, breadcrumb, search icon, user dropdown. Breadcrumb shows "SpeedWrite" (→ /) and document title when open — no sub-page labels in breadcrumb. Props: `user`, `onLogout`, `docTitle`, `isRenaming`, `onRenameSave`, `onRenameCancel`. The user area shows `display_name || email` as a dropdown trigger (▾); dropdown items: "Account settings" (→ `/account`) and "Sign out". Dropdown closes on outside click or Escape.

**Tier 2 — Page context bar (ContextBar):** Below the global bar. Left side: tab navigation (Document / Evidence / History); active tab `text-gray-900 font-semibold`, inactive `text-gray-400`. Right side: page-specific action buttons (outlined). ContextBar accepts a `tabs` prop: `[{ label, active, onClick }]`. Action objects support `disabled: true` (renders `opacity-60 cursor-not-allowed`). The optional `controls` prop renders between the tabs and the actions group (not inside the actions flex row).
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
│   ├── mailer.py
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
│   ├── storage.py
│   ├── limits.py
│   └── cleanup.py
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
│       │   ├── Register.jsx
│       │   ├── Account.jsx
│       │   ├── ResetRequest.jsx
│       │   └── ResetConfirm.jsx
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
│       │   ├── attachmentLimits.js   # ATTACHMENT_TRUNCATION_LIMIT and ATTACHMENT_WARNING_THRESHOLD (both 6000)
│       │   └── limits.js             # FREE_ACTION_CAP (50)
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
| `nginx`    | nginx:1.27    | 80            | Reverse proxy + static file server  |

`docker-compose.override.yml` is auto-merged locally. It exposes the backend on 8000, uses a local named volume, overrides the production nginx config with local-dev equivalents (different server names), and suppresses `nginx/default.conf`. The nginx `/api/` location sets `proxy_read_timeout 300s` to handle slow Ollama inference.

Production SSL is handled by a Cloudflare tunnel (`cloudflared`) running on the host — nginx only speaks HTTP. `speedwrite.app.conf` is plain HTTP; no Certbot or `/etc/letsencrypt` involved.

## App Architecture

Main views:

1. **Library** (`/`) — document list left, document detail right. ContextBar: Open · Rename · Delete when a doc is selected.
2. **Document** (`/document/:id`) — tree left, editor middle, AI chat right. ContextBar: Document tab + Save version · Rename · Save as template · Export .txt · Export PDF · Close; switches to Accept · Reject during diff review. Redraft and Insights dropdowns live in the ChatPanel header. Edit/Preview segmented control lives in the Editor panel header.
3. **Evidence** (`/document/:id/evidence`) — source list (260px) left, source detail (flex-1) middle, EvidenceChatPanel (380px) right. Reindex status is shown inline on the Reindex button label: "Reindexing…" (disabled) → "Reindexed ✓" → auto-clears to "Reindex" after 3s.
4. **History** (`/document/:id/history`) — snapshot list left, snapshot detail + MarkdownPreview right.
5. **Account** (`/account`) — centered settings card (max-w-lg). No ContextBar. Sections: Profile (display name), Change email, Change password, Delete account. Each section is an independent form with inline success/error. Delete account uses an inline confirmation area (bg-red-50) with password confirmation.
6. **ResetRequest** (`/reset-password/request`) — unauthenticated. Email field → sends reset link via SendGrid. Form replaced by success message on 200.
7. **ResetConfirm** (`/reset-password/confirm?token=…`) — unauthenticated. New password + confirm fields. Token read from URL query param.

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
- **LLM abstraction** (`llm.py`): `complete()` routes to `_complete_anthropic` or `_complete_ollama`. Anthropic is the only active path. `_complete_ollama()` is retained but dormant — no UI toggle and `LLM_PROVIDER`/`OLLAMA_CHAT_MODEL` are commented out in `.env.example`. `config.py` and `ProviderToggle.jsx` have been deleted. Active model: `FREE_MODEL = "claude-haiku-4-5-20251001"` (module-level constant). Sonnet string retained as a comment for Sprint 2 plan-based routing.
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

## Editor Find Bar

- Triggered by the magnifying glass icon button in the Editor panel header (left of the Edit/Preview segmented control) or Ctrl+F / Cmd+F while the textarea is focused. Only available in edit mode when `pendingProposal` is falsy.
- Slim bar (`h-10`, `bg-gray-50`, `border-b`) rendered between the panel header and the textarea. Not shown in Preview or diff view.
- Layout (left to right): search input · ↑ · ↓ · counter · flex spacer · ×.
- Counter shows `X / Y` (blank when no query); no special treatment for zero results — just shows `0 / 0`.
- Matches computed with `useMemo` (case-insensitive) to avoid stale-counter flicker. `findIndex` resets to 0 when `findQuery` changes.
- Navigation selects the match via `setSelectionRange` and scrolls to it using the mirror div technique (same as `scrollToHeading`), subtracting 60px padding.
- Enter / Shift+Enter on the input navigate next/prev. Escape closes the bar. Switching to Preview mode closes and resets the bar. Closing returns focus to the textarea.
- State: `findOpen`, `findQuery`, `findIndex` (useState); `findMatches` (useMemo).

## Chat Panel

- **Attachment**: `AttachmentPopup.jsx` (+ button). Section picker uses `parseHeadingsWithContent` from `Document.jsx`; evidence picker uses `doc.evidence`. Popup closes on outside click (anchor-ref-aware) or Escape.
- **Context chip**: shows label + char count. Amber styling + `⚠` when truncated. Hard truncation at 6000 chars (`ATTACHMENT_TRUNCATION_LIMIT`), amber warning threshold also 6000. `originalLength` stored pre-truncation. `AttachmentPopup` passes raw content — truncation all happens in `ChatPanel`.
- **Context priority**: `localContext` (popup) takes priority over `contextText` prop (editor selection). `contextText` being set clears `localContext`. Both cleared on send.
- **Context label**: stored in `chat_history` as `context_label` on user entries. User messages with a label show a small tag above the bubble, right-aligned.
- **forwardRef**: `ChatPanel` exposes `appendMessages(userMsg, assistantMsg)` and `prefillRewrite(content, heading)` via `useImperativeHandle`.
- **Stop button**: replaces Send while request in flight. Calls `AbortController.abort()`; `AbortError` caught silently. `api.js` `request()` accepts optional `signal`.
- **Enter key**: configurable. `localStorage` key is `speedwrite_submit_on_enter`. Send button uses `onClick={() => handleSend()}` — not `onClick={handleSend}` — to prevent the click event being passed as `textOverride`. `EvidenceChatPanel` follows the same pattern.
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

## Auth & Account Management

- **Password reset flow**: `POST /auth/reset-password/request` (no auth) generates a `secrets.token_urlsafe(32)` token, stores `reset_token` + `reset_token_expires` (UTC ISO, 1 hour) on the user record, and emails a link via SendGrid (`mailer.py`). Always returns 200 — does not reveal whether email exists. SendGrid errors are logged but not surfaced. `POST /auth/reset-password/confirm` validates token + expiry, hashes new password, clears token fields.
- **Change password**: `POST /auth/change-password` (auth required) — verifies current password before updating.
- **Change email**: `POST /auth/change-email` (auth required) — verifies password, checks uniqueness.
- **Update profile**: `POST /auth/update-profile` (auth required) — saves `display_name` on user record. `GET /auth/me` returns `display_name` (Optional, may be null).
- **Delete account**: `DELETE /auth/account` (auth required) — verifies password, removes user from `users.json`, then `shutil.rmtree` on docs, embeddings, and templates dirs for that user.
- **Email sending**: `backend/mailer.py` wraps SendGrid. Named `mailer.py` (not `email.py`) to avoid shadowing Python's stdlib `email` module.
- **User record fields**: `id`, `email`, `hashed_password`, `display_name` (optional), `plan` (string, default `"free"`), `byok_key_encrypted` (optional, Fernet-encrypted Anthropic API key), `ai_actions_used` (int, default 0), `ai_actions_reset_at` (optional UTC ISO string — month boundary for counter reset), `reset_token` (optional), `reset_token_expires` (optional UTC ISO string). All optional fields are read with `.get()` so existing records degrade safely.
- **BYOK endpoints**: `POST /auth/byok` saves an encrypted key; `DELETE /auth/byok` removes it. `GET /auth/me` returns `has_byok_key` (bool) and `byok_key_masked` (e.g. `sk-ant-••••••••1234`). Encryption uses Fernet (`cryptography` library); key comes from `ENCRYPTION_KEY` env var. `get_byok_key(user)` in `auth.py` returns the decrypted key or `None` (raises HTTP 500 if key is stored but decryption fails). All LLM call sites (`chat.py`, `evidence_chat.py`, `actions.py`, `templates.py`) call `get_byok_key(user)` and pass the result to `complete()`.

## Data Storage

JSON files on disk — no database.

| Path | Purpose |
|------|---------|
| `/var/speedwrite/users.json` | All user accounts |
| `/var/speedwrite/documents/{user_id}/{doc_id}.json` | Document data: content, evidence, chat history, protected sections, version history, save_count |
| `/var/speedwrite/documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |
| `/var/speedwrite/embeddings/{user_id}/{doc_id}.json` | Chunked embeddings for all evidence sources |
| `/var/speedwrite/templates/{user_id}/{template_id}.json` | User-saved templates |

> **Note**: The local dev named volume is `dev_speedwrite_data` — Docker Compose prefixes it with the project name, so the actual volume is `speedwrite_dev_speedwrite_data`. It mounts to `/var/speedwrite` in `docker-compose.override.yml`.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing secret |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SENDGRID_API_KEY` | SendGrid API key — required for password reset emails |
| `EMAIL_FROM` | Sender address for reset emails (default: `noreply@speedwrite.app`) |
| `APP_URL` | Public app URL used in reset email links (default: `http://localhost`) |
| `ENCRYPTION_KEY` | Fernet key for encrypting BYOK API keys at rest — generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `OLLAMA_HOST` | Ollama base URL (default: `http://172.17.0.1:11434`) — used for embeddings only. Local dev on Windows/Mac: `http://host.docker.internal:11434` |
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

> **Warning:** `docker-compose.override.yml` must never run in production. `deploy.sh` explicitly passes `-f docker-compose.yml` to prevent Docker Compose from auto-merging it. The override file is for local dev only.

## Monetisation

### Sprint 1 scaffolding
- **Plan field**: `plan: str = "free"` on `UserOut` and written on register. Defaults safely via `.get("plan", "free")`.
- **Model**: All users on `FREE_MODEL` (`claude-haiku-4-5-20251001`). `PAID_MODEL = "claude-sonnet-4-20250514"` is defined in `llm.py` for Sprint 2.
- **Evidence limit**: `FREE_EVIDENCE_LIMIT = 10` — defined in `backend/limits.py` (moved from `evidence.py` in Sprint 3). All four add-evidence endpoints enforce it with HTTP 400.

### Sprint 2 — BYOK (Bring Your Own Key)
- Users can save their own Anthropic API key via Account settings → "Anthropic API Key" section.
- Key is Fernet-encrypted at rest using `ENCRYPTION_KEY` env var (`cryptography` library, `requirements.txt`).
- `complete()` in `llm.py` accepts `byok_key=` parameter. When present, uses the user's key and `PAID_MODEL` (Sonnet); otherwise uses the app key and `FREE_MODEL` (Haiku).
- `get_byok_key(user)` in `auth.py`: returns decrypted key, `None` if not set, raises HTTP 500 if stored but decryption fails (e.g. rotated `ENCRYPTION_KEY`).
- All LLM call sites pass `byok_key=get_byok_key(user)` to `complete()`.
- Frontend: `Account.jsx` shows input (no key) or masked key + Remove button (key set). `api.saveByokKey` / `api.removeByokKey` in `api.js`.

### Sprint 3 — AI action cap
- **Limits module**: `backend/limits.py` holds `FREE_ACTION_CAP` and `FREE_EVIDENCE_LIMIT`. `frontend/src/constants/limits.js` exports `FREE_ACTION_CAP` for the frontend.
- **Counter fields**: `ai_actions_used` (int) and `ai_actions_reset_at` (ISO string) on the user record. `GET /auth/me` returns both. `get_actions_used(user)` in `auth.py` returns the count, resetting to 0 if the stored month differs from now. `increment_action_count(user_id)` reloads users, resets if stale, increments, and saves.
- **Cap enforcement**: `chat.py`, `evidence_chat.py`, and `actions.py` check cap before calling `complete()` (free users only — BYOK users bypass). Returns HTTP 429 with message `"Monthly limit of {FREE_ACTION_CAP} AI actions reached…"`. `increment_action_count` is called after each successful `complete()`. `templates.py` is intentionally excluded (one-time setup, not conversational).
- **Frontend cap UI**: `ChatPanel` and `EvidenceChatPanel` accept `actionsUsed` and `hasByokKey` props. When capped: Send button disabled with tooltip, amber banner shown above input with link to Account settings. 429 cap errors are displayed as plain assistant messages (no "Error:" prefix).
- **TopBar indicator**: Shows "Sonnet" (BYOK) or "Haiku · N actions left" (free) between the search icon and user dropdown on all pages. Turns amber at 0.
- **Stale counter cleanup**: `cleanup.py` now also runs `reset_stale_action_counters()`, which zeroes `ai_actions_used` for any user whose `ai_actions_reset_at` is from a prior month.

## Maintenance

`backend/cleanup.py` is a standalone script with two functions: `clear_expired_reset_tokens()` nulls out expired `reset_token`/`reset_token_expires` fields; `reset_stale_action_counters()` zeroes `ai_actions_used` for users whose counter month is in the past. Both run from `__main__` and exit 0.

Run via cron (installed by `bootstrap.sh`):
```
0 3 * * * docker exec speedwrite-app python cleanup.py >> /var/log/speedwrite-cleanup.log 2>&1
```
`bootstrap.sh` writes the current crontab to a temp file, appends the job if not already present, and reloads with `crontab`.

## Key Commands

```bash
docker compose logs -f app       # backend logs
docker compose logs -f nginx     # nginx logs
docker compose restart app       # restart backend
docker compose up --build -d     # rebuild everything
docker compose ps                # container status
```
