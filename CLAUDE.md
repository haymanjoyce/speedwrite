# SpeedWrite — Claude Code Context

## Project Overview

SpeedWrite is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

## Intentional Removals

### Audit Log removed (do not re-add)

The Audit Log feature (`log.py`, `Log.jsx`, `append_audit_log`, `addLogEntry`, `/document/:id/log` route) was removed intentionally. It is an audit trail, not a user-facing document authoring feature. The Log concept is out of scope for SpeedWrite. Do not re-add audit logging or a Log tab to SpeedWrite.

Existing `audit_log` arrays in document JSON files are harmless and simply ignored.

### Templates removed (do not re-add)

The templates feature (`backend/templates.py`, `TemplatePickerOverlay.jsx`, `frontend/src/data/templates.js`, `/templates` API routes, "From template…" on Home, "Save as template" on Document) was removed intentionally. Do not re-add document templates or a template picker.

## Design Decisions

### Rewrite operates at section level, not selected-text level

The Rewrite button lives on tree node hover and operates on the full section under a heading, not on arbitrary selected text. Do not add Rewrite to the context bar for text selections — LLMs are unreliable at mid-paragraph substitution. If sentence-level rewriting is needed, implement via backend text substitution (AI rewrites only the selection, backend does the replacement), not by asking the AI to return a full document with the replacement embedded.

## UI Conventions

### Three-tier navigation hierarchy

**Tier 1 — Global bar (TopBar):** Always visible. Props: `user`, `onLogout`, `docTitle`, `isRenaming`, `onRenameSave`, `onRenameCancel`, `pageTitle`, `onFeedbackClick`. SpeedWrite logo links to `/home`. User dropdown: "Give feedback" (when `onFeedbackClick` provided) · "Administration" (admins only) · "Account settings" · "Sign out"; closes on outside click or Escape. `pageTitle` is for non-document pages; `docTitle` takes priority if both are set.

**Tier 2 — Page context bar (ContextBar):** Below the global bar. Left side: tab navigation (Document / Evidence / History); active tab bold, inactive muted. Right side: page-specific action buttons (outlined). ContextBar accepts a `tabs` prop: `[{ label, active, onClick }]`. Action objects support `disabled: true`. The optional `controls` prop renders between the tabs and the actions group (not inside the actions flex row). The optional `rightControls` prop renders inside the actions flex row, to the left of the action buttons — use this for dropdowns that must sit alongside action buttons. Per-page action inventories are in App Architecture below.

**Tier 3 — Panel headers:** Slim headers, label uppercase small caps left-aligned, panel-specific actions right-aligned in header or below it.

### Control type rules

- **All buttons** use `Button.jsx` (variants: primary/secondary/danger/ghost) or `ContextBar.jsx` action objects. Do not hand-roll button styles.
- **ContextBar actions** (Tier 2): use action objects with variant 'primary', 'danger', or 'default'. Default renders as secondary style.
- **Panel header buttons** (Tier 3): use `<Button variant="secondary" size="sm">` for standard actions, `<Button variant="primary" size="sm">` for the primary action on a panel.
- **Dropdown triggers** (`ActionsDropdown.jsx`, `InsightsDropdown` in EvidenceChatPanel): styled to match Button.jsx secondary.
- **Segmented controls** (`SegmentedControl.jsx`): active = blue, inactive = gray.
- **Icon buttons** (e.g. find bar magnifying glass, TopBar search): ghost style (no bg/border).
- Destructive actions (Delete) always red; primary actions always blue; everything else secondary grey.

### General principles
- Labels left, actions right — they never compete
- Destructive actions (Delete) always red; primary actions (Add, New) always blue
- The further down the tier, the more specific the action scope

### No-modal rule
The app avoids modals — actions happen inline or in panels. The **one intentional exception** is `SearchOverlay.jsx` (global search). Do not add further modals without equally strong justification.

### Delete confirmations
Destructive deletes use an inline confirmation bar below the context bar, not `window.confirm()`. Escape/Cancel dismisses. `pendingDelete` boolean controls visibility; cleared on selection change and on success. Applies to: document delete (`Home.jsx`) and evidence delete (`Evidence.jsx`).

## Repository Structure

```
speedwrite/
├── backend/
│   ├── main.py
│   ├── auth.py
│   ├── mailer.py
│   ├── feedback.py
│   ├── documents.py
│   ├── chat.py
│   ├── evidence.py
│   ├── evidence_chat.py
│   ├── actions.py
│   ├── embeddings.py
│   ├── llm.py
│   ├── search.py
│   ├── export.py
│   ├── models.py
│   ├── storage.py
│   ├── limits.py
│   ├── cleanup.py
│   ├── sharing.py
│   ├── images.py
│   └── admin.py
├── frontend/
│   └── src/
│       ├── context/
│       │   └── SearchContext.jsx
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── Home.jsx
│       │   ├── Document.jsx
│       │   ├── Evidence.jsx
│       │   ├── History.jsx
│       │   ├── Images.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Account.jsx
│       │   ├── ResetRequest.jsx
│       │   ├── ResetConfirm.jsx
│       │   ├── Admin.jsx
│       │   └── SharedView.jsx
│       ├── components/
│       │   ├── FeedbackBar.jsx
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
│       │   ├── EvidenceChatPanel.jsx
│       │   ├── EvidenceSidebar.jsx
│       │   ├── SourceDetail.jsx
│       │   └── AddSourceModal.jsx
│       ├── constants/
│       │   ├── attachmentLimits.js   # ATTACHMENT_TRUNCATION_LIMIT and ATTACHMENT_WARNING_THRESHOLD (both 6000)
│       │   └── limits.js             # FREE_ACTION_CAP (1000)
│       ├── insightPrompts.js         # SHARED_INSIGHT_ACTIONS (EvidenceChatPanel) and DOCUMENT_INSIGHT_ACTIONS (ChatPanel)
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

1. **Landing** (`/`) — public, unauthenticated, no TopBar/ContextBar. Tagline + Create account button, vertically distributed at golden ratio. Logout and account-delete both redirect here. File: `LandingPage.jsx`.
2. **Library** (`/home`) — document list left, document detail right. ContextBar: Import ▾ dropdown (via `rightControls`) · New Document (primary). Duplicate calls `POST /documents/{doc_id}/duplicate`, prepends the new doc to the list, and selects it (no navigation). Import error bar also surfaces duplicate errors.
3. **Document** (`/document/:id`) — tree left, editor middle, AI chat right. ContextBar: Document tab + Save version · Rename · Export ▾ dropdown (`.txt`/`.pdf`, via `rightControls`, hidden when proposal pending) · Close; switches to Accept · Reject during diff review.
4. **Evidence** (`/document/:id/evidence`) — source list left, source detail middle, EvidenceChatPanel right.
5. **History** (`/document/:id/history`) — snapshot list left, version detail + MarkdownPreview middle, sharing & comments right. ContextBar: tabs + Close only. VERSION panel header shows "Restore this version" when a snapshot is selected. Share action lives exclusively in the COMMENTS panel header.
6. **Images** (`/document/:id/images`) — image list left, image detail right. Selected image fetched as blob (auth header) → `createObjectURL`; Copy URL writes `![filename](/api/documents/{doc_id}/images/{filename})` to clipboard. Delete uses inline confirmation bar pattern. Backend: `backend/images.py` — PNG/JPG/GIF/WebP only, 5 MB limit, storage at `/var/speedwrite/documents/{user_id}/{doc_id}/images/`. Document delete also removes the images directory. Filenames URL-encoded in all API paths (`encodeURIComponent` on filename segment only). `MarkdownPreview.jsx` renders `![…](/api/documents/…)` images via `AuthImage` (same fetch-as-blob pattern).
7. **Account** (`/account`) — no ContextBar. Sections: Profile, Change email, Change password, Delete account — each an independent form with inline success/error.
8. **ResetRequest** (`/reset-password/request`) — unauthenticated. Always returns 200 (does not reveal whether email exists).
9. **ResetConfirm** (`/reset-password/confirm?token=…`) — unauthenticated. Token read from URL query param.
10. **SharedView** (`/shared/:token`) — unauthenticated, no TopBar/ContextBar. Left: document title, snapshot label + timestamp, rendered markdown. Right: comment list + submission form (name + body). Shows 404 if token not found.
11. **Admin** (`/admin`) — read-only admin interface. Auth required; renders "Access denied" if `user.is_admin` is false (backend also enforces 403). "Actions left" shows "Unlimited" for BYOK users. To grant access, set `"is_admin": true` on the user record in `users.json` directly — no UI for this. TopBar dropdown shows an "Administration" link when `user.is_admin` is true.

`ErrorBoundary.jsx` wraps the router and each page route in `App.jsx` — two levels, so a crash in one page doesn't block navigation.

## AI Features

- **Agent panel**: AI can propose document changes in any message. `<proposed_document>` block triggers diff view. Chat panel is hidden via `display: none` (not unmounted) so ref and chat state survive the reject path — `className={pendingProposal ? 'hidden' : 'contents'}`.
- **Inline diff** (`DiffView.jsx`): LCS-based. Auto-scrolls to first change on mount. Occupies the same flex slot as the editor.
- **Rewrite button**: On tree node hover. Calls `chatPanelRef.current.prefillRewrite(sectionContent, headingText)` — cross-component call from `Document.jsx` to `ChatPanel`.
- **Context scoping**: When context is attached, AI is instructed to change only that section and return the full document with only that part replaced. `ignore_history: true` is set whenever context is attached.
- **Content override safety**: `editorContentOverride` in `Document.jsx` is a one-shot signal. `onContentOverrideApplied` fires immediately after `Editor.jsx` applies it to clear it back to `null`.
- **Document actions routing (important)**: Redraft actions in `ChatPanel` go through `fireInsightInternal` → `handleSend` → `api.chatMessage` → `chat.py`. They do **NOT** call `api.documentAction` / `actions.py`. Only `Home.jsx` description generation calls `api.documentAction` (action: `generate_description`). After generation, `Home.jsx` persists the result via `api.updateDocument({ description })`. `DocumentUpdate` accepts an optional `description` field; `documents.py` sets it when present.
- **Redraft vs Insights**: Both dropdowns in ChatPanel header, both disabled when `pendingProposal` is truthy. Redraft shows `InstructionBar` for optional instructions before firing. Insights fire immediately. ChatPanel Insights use `DOCUMENT_INSIGHT_ACTIONS` (document-focused prompts); EvidenceChatPanel Insights use `SHARED_INSIGHT_ACTIONS` (evidence-source-focused prompts). Both exported from `insightPrompts.js`.
- **Evidence base**: File uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, other documents. URL sources carry `last_fetched_at` and `last_fetch_error`. `POST .../evidence/{id}/refresh` updates content and re-embeds on success. "Update sources" in Sources panel header runs all URL sources sequentially. Duplicate URL detection shows amber banner in SourceDetail.
- **Embeddings/RAG**: Embedded via Ollama `nomic-embed-text`. At chat time, if total non-live evidence > 8000 chars and embeddings exist, top-5 chunks retrieved instead of full context dump. Per-source RAG preflight in ChatPanel/EvidenceChatPanel: `api.ragQuery` → `POST .../evidence/{id}/rag-query`; if `used_rag: true`, chunks replace context. Falls back silently if Ollama unreachable.
- **LLM abstraction** (`llm.py`): `complete()` routes to `_complete_anthropic` or `_complete_ollama`. Anthropic is the only active path. `_complete_ollama()` is retained but dormant — no UI toggle and `LLM_PROVIDER`/`OLLAMA_CHAT_MODEL` are commented out in `.env.example`. `config.py` and `ProviderToggle.jsx` have been deleted. Active model: `FREE_MODEL = "claude-haiku-4-5-20251001"` (module-level constant). Sonnet string retained as a comment for Sprint 2 plan-based routing.
- **Evidence chat** (`EvidenceChatPanel.jsx`): Persistent chat on Evidence page. "All sources" option concatenates all sources. `ignore_history: true` when context attached. Backend: `POST /documents/{doc_id}/evidence-chat` in `evidence_chat.py`. Never modifies the document.
- **Token limits**: `max_tokens=4096` in `chat.py` and `actions.py`. Large attachments can still cause truncation if total prompt + response exceeds model context window.
- **Document export**: `GET .../export/txt` strips markdown to plain text. `GET .../export/pdf` uses `markdown` + `weasyprint`. Both auth-required, filename-sanitised. Frontend: `api.downloadExport` fetches as blob, extracts filename from header, triggers download via temporary `<a>`.
- **Document import**: `POST /documents/import` (multipart, auth required). Accepts `.docx` only (400 otherwise). Converts via mammoth → html2text; falls back to raw text if html empty. Title from filename, truncated to 200 chars. Route must be defined before `/{doc_id}` routes in `documents.py` (ordering constraint). Dependencies: `mammoth==1.8.0`, `html2text==2024.2.26`.
- **Global search**: `POST /search` — searches titles, content, evidence, chat history (not evidence_chat_history); ≤5 results per group. `SearchOverlay.jsx` triggered by Cmd/Ctrl+K or search icon. Evidence results navigate to Evidence view with `{ state: { evidenceId } }`; `Evidence.jsx` pre-selects on load via `initialSelectDoneRef` (one-shot).

## Document Tree

- **Rewrite** button on hover (hidden for protected headings). Former "Add" button removed — use + in chat input.
- Protected nodes show lock icon; unlocked nodes show it faintly on hover.
- Clicking heading scrolls editor to it via `useImperativeHandle` on Editor.
- No `##` headings → DocumentSidebar shows placeholder. `parseHeadings` is exported from `DocumentTree.jsx`.

## Editor Find Bar

- Only available in edit mode when `pendingProposal` is falsy. Not shown in Preview or diff view.
- Triggered by magnifying glass button in Editor header or Ctrl+F / Cmd+F when textarea is focused.
- Enter / Shift+Enter navigate next/prev. Escape closes. Switching to Preview closes and resets. Closing returns focus to textarea.
- `findMatches` is `useMemo` (case-insensitive) to avoid stale-counter flicker on rapid typing.

## Chat Panel

- **Attachment**: `AttachmentPopup.jsx` (+ button). Section picker uses `parseHeadingsWithContent` from `Document.jsx`; evidence picker uses `doc.evidence`. Popup closes on outside click (anchor-ref-aware) or Escape.
- **Context chip**: shows label + char count. Amber styling + `⚠` when truncated. Hard truncation at 6000 chars (`ATTACHMENT_TRUNCATION_LIMIT`), amber warning threshold also 6000. `originalLength` stored pre-truncation. `AttachmentPopup` passes raw content — truncation all happens in `ChatPanel`.
- **Context priority**: `localContext` (popup) takes priority over `contextText` prop (editor selection). `contextText` being set clears `localContext`. Both cleared on send.
- **Context label**: stored in `chat_history` as `context_label` on user entries. User messages with a label show a small tag above the bubble, right-aligned.
- **forwardRef**: `ChatPanel` exposes `appendMessages(userMsg, assistantMsg)` and `prefillRewrite(content, heading)` via `useImperativeHandle`.
- **Stop button**: replaces Send while request in flight. Calls `AbortController.abort()`; `AbortError` caught silently. `api.js` `request()` accepts optional `signal`.
- **Chat / Edit split**: Input row has two buttons — Edit (gray, left) and Send (blue, right). Send submits in `mode: "chat"`; Edit submits in `mode: "edit"`. Enter key always triggers Send (chat mode). Stop replaces both while loading. Both disabled when input empty or user capped. `handleSend(textOverride, mode = 'chat')` — mode stored on user messages in local state only (not persisted to `chat_history`). Edit-mode user bubbles show a muted pill "Edit" badge. Redraft and Insights fire via `fireInsightInternal` which calls `handleSend(promptText, 'edit')` so they continue to return proposed documents. Backend: `mode` field on `ChatRequest` (default `"chat"`); `_build_mode_instruction()` appended to system prompt — chat mode forbids `<proposed_document>` blocks entirely; edit mode requires one (clarification-only exception).
- **Preserve instruction** (`_PRESERVE_INSTRUCTION` in `chat.py`, imported by `actions.py`): prepended as the first block of the system prompt in both `chat.py` and `actions.py` (before document content and all other instructions). Instructs the AI to return markdown tables, image references (`![alt](url)`), fenced code blocks, and blockquotes verbatim in any proposed document. Uses `CRITICAL INSTRUCTION` framing to reduce the chance of smaller models ignoring it.
- **Enter key**: configurable via `localStorage` (`speedwrite_submit_on_enter`). Send button uses `onClick={() => handleSend()}` — not `onClick={handleSend}` — to prevent the click event being passed as `textOverride`. `EvidenceChatPanel` follows the same pattern.
- **onActionComplete**: Optional callback prop (default `null`) on both `ChatPanel` and `EvidenceChatPanel`. Called after each successful AI response (fire-and-forget, no await). Pages pass `() => { api.me().then(setUser).catch(() => {}) }` so the TopBar usage counter refreshes live after each action.

## Document History

- Snapshots: `history: list` on doc JSON; max 50 (oldest dropped). Auto-snapshot every 10 saves.
- Four triggers: `auto`, `rewrite`, `restore`, `manual`.
- Each snapshot entry has: `id`, `timestamp`, `trigger`, `label`, `content`, `share_token` (string|null), `comments` (list). `share_token` and `comments` initialised in `add_snapshot()`; existing snapshots without them degrade safely via `.get()`.
- `POST /documents/{doc_id}/snapshot` — body `{ label, trigger }`. Returns new entry.
- `GET /documents/{doc_id}/history` — list newest-first, strips to `id`, `timestamp`, `trigger`, `label`, `is_shared` (bool), `comment_count` (int). No `content` or `share_token` in list.
- `GET /documents/{doc_id}/history/{snapshot_id}` — full snapshot with content, share_token, comments.
- Restore flow: History.jsx navigates to `/document/:id` with `{ state: { restoreContent, restoreSnapshotId, restoreSnapshotLabel } }`. `Document.jsx` reads this on load, sets `pendingProposal`, sets `pendingProposalReason: 'restore'`, clears location state via `window.history.replaceState`. Accept → `trigger='restore'` snapshot created; Reject → unchanged.
- `pendingProposalReason`: `'ai_rewrite'` (default) or `'restore'`. Controls snapshot trigger in `handleAccept`. Reset to `'ai_rewrite'` after accept.
- `flashStatus` prop on `Editor.jsx`: shows brief messages (e.g. "Version saved") in Editor header, overriding save status for 3 seconds.

## Version Sharing

Sharing is tied to History snapshots (immutable), not to the live document. Anyone with a share link can view the snapshot and leave a comment (name + body). The document owner can delete comments.

- **Backend**: `backend/sharing.py` — registered last in `main.py` (no prefix).
- **Share/unshare**: `POST .../share` (idempotent — returns existing token if already set). `POST .../unshare` sets `share_token = None`.
- **Public read**: `GET /shared/{token}` — no auth. `_find_snapshot_by_token()` scans all users' documents via `load_users()` + `list_documents()`. Returns `doc_title`, `label`, `timestamp`, `content`, `comments`.
- **Public comments**: `POST /shared/{token}/comments` — no auth; sets `is_owner: False`. `DELETE .../comments/{comment_id}` — auth required; 404 if not found.
- **Owner comments**: `POST .../comments` — auth required; name derived from `display_name || email`; sets `is_owner: True`.
- **`is_owner` field**: present on all new comments; old entries without it default to `False` via `.get()`. Owner comments get distinct styling + "Owner" badge in both History.jsx and SharedView.jsx.
- **Share URL**: `window.location.origin + '/shared/' + token` — never hardcoded to a domain.
- **History.jsx COMMENTS panel**: "Share this version" / "Revoke" in header. `comment_count` in snapshot list state updated optimistically on add/delete.

## Feedback

Users can submit feedback from any page via "Give feedback" in the TopBar user dropdown.

- **Trigger**: `onFeedbackClick` prop on `TopBar`. All pages pass `() => setShowFeedback(true)`.
- **UI**: `FeedbackBar.jsx` — slim bar rendered below TopBar (same pattern as inline confirmation bars). Single text input (maxLength 2000), Send button, × close. Escape also closes. Auto-closes 2s after successful send.
- **Backend**: `POST /feedback` in `backend/feedback.py`, auth required. Validates message non-empty and ≤2000 chars. Sends email via `mailer.send_email()` to `FEEDBACK_EMAIL` (env var, defaults to `EMAIL_FROM`). Always returns `{"ok": true}` — email failures are logged but not surfaced to the user.
- **`mailer.send_email()`**: Generic helper added to `mailer.py` to support feedback (and future transactional emails) beyond just password reset.
- **`FEEDBACK_EMAIL`** env var: optional; defaults to `EMAIL_FROM` if not set.

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
- When `structureLocked` is true, heading lines highlighted in both `DiffView` and `MarkdownPreview`. `DiffView` matches `/^#{1,6}\s/`.
- `MarkdownPreview.jsx` uses `react-markdown` + `remark-gfm` (no hand-rolled renderer). Protected and structure-lock highlighting applied via custom `components` renderers using `node.position.start.line` (1-indexed, converted to 0-indexed to match `getProtectedLineSet`). `dangerouslySetInnerHTML` removed.
- `ChatPanel` receives and forwards `structureLocked` on every message (including Redraft actions, which route through `handleSend`).

## Auth & Account Management

- **Password reset flow**: Token TTL 1 hour. Always returns 200 — does not reveal whether email exists. SendGrid errors logged, not surfaced.
- **Change password**: `POST /auth/change-password` — verifies current password before updating.
- **Change email**: `POST /auth/change-email` — verifies password, checks uniqueness.
- **Update profile**: `POST /auth/update-profile` — saves `display_name`; `GET /auth/me` returns it (may be null).
- **Delete account**: `DELETE /auth/account` — verifies password, then `shutil.rmtree` on docs and embeddings dirs.
- **Email sending**: Named `mailer.py` (not `email.py`) to avoid shadowing Python's stdlib `email` module.
- **User record fields**: `id`, `email`, `hashed_password`, `display_name`, `plan` (default `"free"`), `byok_key_encrypted`, `ai_actions_used`, `ai_actions_reset_at` (month boundary for reset), `reset_token`, `reset_token_expires`, `is_admin` (default `False` — set manually in `users.json`). All optional fields use `.get()` so existing records degrade safely.
- **BYOK endpoints**: `GET /auth/me` returns `has_byok_key` (bool) and `byok_key_masked`. Encryption uses Fernet; key from `ENCRYPTION_KEY` env var. `get_byok_key(user)` returns decrypted key or `None` — raises HTTP 500 if key is stored but decryption fails. All LLM call sites (`chat.py`, `evidence_chat.py`, `actions.py`) call `get_byok_key(user)` and pass the result to `complete()`.

## Data Storage

JSON files on disk — no database.

| Path | Purpose |
|------|---------|
| `/var/speedwrite/users.json` | All user accounts |
| `/var/speedwrite/documents/{user_id}/{doc_id}.json` | Document data: content, evidence, chat history, protected sections, version history, save_count |
| `/var/speedwrite/documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |
| `/var/speedwrite/documents/{user_id}/{doc_id}/images/` | Uploaded images (PNG/JPG/GIF/WebP) |
| `/var/speedwrite/embeddings/{user_id}/{doc_id}.json` | Chunked embeddings for all evidence sources |

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
| `FEEDBACK_EMAIL` | Address to receive feedback emails (optional — defaults to `EMAIL_FROM`) |
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
- **Evidence limit**: `FREE_EVIDENCE_LIMIT = 50` — defined in `backend/limits.py` (moved from `evidence.py` in Sprint 3). All four add-evidence endpoints enforce it with HTTP 400.

### Sprint 2 — BYOK (Bring Your Own Key)
- Users add their Anthropic API key in Account settings. BYOK users get `PAID_MODEL` (Sonnet); free users get `FREE_MODEL` (Haiku). See Auth section for encryption and endpoint details.
- Frontend: `Account.jsx` shows input (no key) or masked key + Remove button. `api.saveByokKey` / `api.removeByokKey` in `api.js`.

### Sprint 3 — AI action cap
- **Limits module**: `backend/limits.py` holds `FREE_ACTION_CAP` and `FREE_EVIDENCE_LIMIT`. `frontend/src/constants/limits.js` exports `FREE_ACTION_CAP` for the frontend.
- **Counter fields**: `ai_actions_used` (int) and `ai_actions_reset_at` (ISO string) on the user record. `GET /auth/me` returns both. `get_actions_used(user)` in `auth.py` returns the count, resetting to 0 if the stored month differs from now. `increment_action_count(user_id)` reloads users, resets if stale, increments, and saves.
- **Cap enforcement**: `chat.py`, `evidence_chat.py`, and `actions.py` check cap before calling `complete()` (free users only — BYOK users bypass). Returns HTTP 429 with message `"Monthly limit of {FREE_ACTION_CAP} AI actions reached…"`. `increment_action_count` is called after each successful `complete()`.
- **Frontend cap UI**: `ChatPanel` and `EvidenceChatPanel` accept `actionsUsed` and `hasByokKey` props. When capped: Send button disabled with tooltip, amber banner shown above input with link to Account settings. 429 cap errors are displayed as plain assistant messages (no "Error:" prefix).
- **TopBar indicator**: Shows "Sonnet" (BYOK) or "Haiku · N actions left" (free) between the search icon and user dropdown on all pages. Turns amber at 0.
- **Stale counter cleanup**: `cleanup.py` now also runs `reset_stale_action_counters()`, which zeroes `ai_actions_used` for any user whose `ai_actions_reset_at` is from a prior month.

## Maintenance

`backend/cleanup.py`: `clear_expired_reset_tokens()` and `reset_stale_action_counters()`. Runs from `__main__`. Installed as a daily cron by `bootstrap.sh`:
```
0 3 * * * docker exec speedwrite-app python cleanup.py >> /var/log/speedwrite-cleanup.log 2>&1
```

## Key Commands

```bash
docker compose logs -f app       # backend logs
docker compose logs -f nginx     # nginx logs
docker compose restart app       # restart backend
docker compose up --build -d     # rebuild everything
docker compose ps                # container status
```
