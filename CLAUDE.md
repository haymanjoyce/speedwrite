# SpeedWrite — Claude Code Context

## Project Overview

SpeedWrite is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

## Intentional Removals

### Audit Log removed (do not re-add)

The Audit Log feature (`log.py`, `Log.jsx`, `append_audit_log`, `addLogEntry`, `/document/:id/log` route) was removed intentionally. It is an audit trail, not a user-facing document authoring feature. Do not re-add audit logging or a Log tab to SpeedWrite.

Existing `audit_log` arrays in document JSON files are harmless and simply ignored.

### Redraft and Insights removed (do not re-add)

The Redraft dropdown (rewrite/restructure/expand/condense/simplify/formalise), Insights dropdown in `ChatPanel`, and Insights dropdown in `EvidenceChatPanel` were removed intentionally. This includes `insightPrompts.js`, `REDRAFT_LABELS`/`REDRAFT_PROMPTS`/`INSIGHTS_PROMPTS` constants, `pendingAction` state, `instructionInputRef`, `handleActionSelect`/`runAction`/`fireInsightInternal`/`fireInsight`, and `InstructionBar.jsx` (now unused). Do not re-add these dropdowns or the insight/redraft dispatch flow.

### Templates removed (do not re-add)

The templates feature (`backend/templates.py`, `TemplatePickerOverlay.jsx`, `frontend/src/data/templates.js`, `/templates` API routes, "From template…" on Home, "Save as template" on Document) was removed intentionally. Do not re-add document templates or a template picker.

## Design Decisions

### "Add to chat" operates at section level, not selected-text level

The "Add to chat" button on tree node hover attaches the full section under a heading as context — it does not prefill any input text. Do not add section-level rewrite triggers to the context bar for text selections — LLMs are unreliable at mid-paragraph substitution. If sentence-level rewriting is needed, implement via backend text substitution (AI rewrites only the selection, backend does the replacement), not by asking the AI to return a full document with the replacement embedded.

## UI Conventions

### Three-tier navigation hierarchy

**Tier 1 — Global bar (TopBar):** Always visible. Props: `user`, `onLogout`, `docTitle`, `isRenaming`, `onRenameSave`, `onRenameCancel`, `pageTitle`, `onFeedbackClick`, `showBack`. SpeedWrite logo links to `/home`. When `showBack={true}` (Document, Evidence, History, Images, Account, Admin), a `←` ghost-style icon button renders instead of the logo and navigates to `/home` on click — renders immediately on mount without waiting for `docTitle` to load. User dropdown: "Give feedback" (when `onFeedbackClick` provided) · "Administration" (admins only) · "Account settings" · "Sign out"; closes on outside click or Escape. `pageTitle` is for non-document pages; `docTitle` takes priority if both are set.

**Tier 2 — Page context bar (ContextBar):** Below the global bar. Left side: tab navigation (Document / Evidence / History); active tab bold, inactive muted. Right side: page-specific action buttons (outlined). ContextBar accepts a `tabs` prop: `[{ label, active, onClick }]`. Action objects support `disabled: true`. The optional `controls` prop renders between the tabs and the actions group. The optional `rightControls` prop renders inside the actions flex row, to the left of the action buttons — use this for dropdowns that must sit alongside action buttons. Per-page action inventories are in App Architecture below.

**Tier 3 — Panel headers:** Slim headers, label uppercase small caps left-aligned, panel-specific actions right-aligned.

### Control type rules

- **All buttons** use `Button.jsx` (variants: primary/secondary/danger/ghost) or `ContextBar.jsx` action objects. Do not hand-roll button styles.
- **ContextBar actions** (Tier 2): use action objects with variant 'primary', 'danger', or 'default'. Default renders as secondary style.
- **Panel header buttons** (Tier 3): use `<Button variant="secondary" size="sm">` for standard actions, `<Button variant="primary" size="sm">` for the primary action on a panel.
- **Dropdown triggers** (`ActionsDropdown.jsx`): styled to match Button.jsx secondary.
- **Segmented controls** (`SegmentedControl.jsx`): active = blue, inactive = gray.
- **Icon buttons** (e.g. find bar magnifying glass, TopBar search): ghost style (no bg/border).
- Delete buttons in the ContextBar use variant: 'default' (secondary grey) when an inline confirmation bar follows — the confirmation bar itself carries the danger colour. The danger variant is reserved for destructive actions with no separate confirmation step. Primary actions always blue; everything else secondary grey.

### General principles
- Labels left, actions right — they never compete
- Delete buttons in the ContextBar use variant: 'default' when an inline confirmation bar follows; danger variant only when there is no separate confirmation step. Primary actions (Add, New) always blue
- The further down the tier, the more specific the action scope

### No-modal rule
The app avoids modals — actions happen inline or in panels. The **one intentional exception** is `SearchOverlay.jsx` (global search). Do not add further modals without equally strong justification.

### Delete confirmations
Destructive deletes use an inline confirmation bar below the context bar, not `window.confirm()`. Escape/Cancel dismisses. `pendingDelete` boolean controls visibility; cleared on selection change and on success. Applies to: document delete (`Home.jsx`) and evidence delete (`Evidence.jsx`).

## Repository Structure

```
speedwrite/
├── backend/
│   ├── main.py, auth.py, mailer.py, feedback.py, documents.py
│   ├── chat.py, evidence.py, evidence_chat.py, actions.py
│   ├── embeddings.py, llm.py, search.py, export.py, models.py
│   ├── storage.py, limits.py, cleanup.py, sharing.py, images.py, admin.py
├── frontend/src/
│   ├── context/SearchContext.jsx
│   ├── pages/  LandingPage, Home, Document, Evidence, History, Images,
│   │           Login, Register, Account, ResetRequest, ResetConfirm, Admin, SharedView
│   ├── components/
│   │   ├── TopBar.jsx, ContextBar.jsx, Button.jsx, SegmentedControl.jsx
│   │   ├── DocumentSidebar.jsx, DocumentTree.jsx, Editor.jsx, DiffView.jsx
│   │   ├── MarkdownPreview.jsx, ChatPanel.jsx, AttachmentPopup.jsx
│   │   ├── ActionsDropdown.jsx, ErrorBoundary.jsx, SearchOverlay.jsx
│   │   ├── EvidenceChatPanel.jsx, EvidenceSidebar.jsx, SourceDetail.jsx
│   │   ├── AddSourceModal.jsx, FeedbackBar.jsx
│   │   ├── Sidebar.jsx          # Unused — kept in repo
│   │   └── InstructionBar.jsx   # Unused — kept in repo
│   ├── constants/
│   │   ├── attachmentLimits.js  # ATTACHMENT_TRUNCATION_LIMIT and ATTACHMENT_WARNING_THRESHOLD (both 6000)
│   │   └── limits.js            # FREE_ACTION_CAP (1000)
│   └── api.js
├── nginx/local_app.conf, speedwrite.app.conf
├── docker-compose.yml, docker-compose.override.yml
├── bootstrap.sh, deploy.sh, CLAUDE.md
```

## Docker Stack

- `frontend` — build-only; copies /dist to volume
- `app` — FastAPI backend (Python 3.12), port 8000
- `nginx` — nginx:1.27, reverse proxy + static files, port 80

`docker-compose.override.yml` is auto-merged locally. It exposes the backend on 8000, uses a local named volume, overrides the production nginx config, and suppresses `nginx/default.conf`. The nginx `/api/` location sets `proxy_read_timeout 300s` for slow Ollama inference.

Production SSL is handled by a Cloudflare tunnel (`cloudflared`) on the host — nginx only speaks HTTP. No Certbot or `/etc/letsencrypt` involved.

## App Architecture

Main views:

1. **Landing** (`/`) — public, unauthenticated, no TopBar/ContextBar. Tagline + Create account button. Logout and account-delete both redirect here. File: `LandingPage.jsx`.
2. **Library** (`/home`) — document list left, document detail right. ContextBar action order: Import · Describe · Rename · Duplicate · Delete · Open · New Document. Import always enabled (triggers hidden `.docx` input). New Document always enabled (primary when no document selected; Open is primary when one is). Describe fires `generate_description` action; shows Describing…/Described ✓ (3s reset); disabled when no document selected or status ≠ idle. Rename/Duplicate/Delete/Open disabled when no document selected. Delete sets `pendingDelete` (inline confirmation bar). Duplicate prepends the new doc and selects it (no navigation). Import/duplicate errors surface in shared error bar. DOCUMENT DETAIL panel: rename input uses Enter/Escape/onBlur only — no ✓/✕ buttons. Structured description rendered via hand-rolled parser (`description.split(/\n(?=## )/)`; heading + bullet extraction).
3. **Document** (`/document/:id`) — tree left, editor middle, AI chat right. ContextBar right side (all in `rightControls`): Edit/Preview toggle · Add to chat (disabled when no text selected; primary when text selected) · Save version (shows Saving… / Saved ✓ with 3s reset; disabled while saving) · Export ▾ (`.txt`/`.pdf`). All four not rendered when proposal pending, which replaces them with Accept (variant: 'primary') · Reject action buttons. `saveVersionStatus` state: `idle`/`saving`/`saved`.
4. **Evidence** (`/document/:id/evidence`) — source list left, source detail middle, EvidenceChatPanel right. ContextBar action order: Describe · Update source · Update all sources · Reindex · Sync now · Delete · Add source (primary, rightmost, always enabled). Update source disabled unless a URL source is selected and not currently refreshing. Update all sources disabled when no URL sources exist. Reindex conditional on items.length > 0; shows Reindexing…/Reindexed ✓. Sync now conditional: document source with sync off. Delete conditional: source selected. Delete confirmation bar uses plain text buttons. `EvidenceSidebar` is label-only — no buttons in panel header, no "+ Add Source" button below it. `SourceDetail` shows a key-value metadata list (no badges/icons); row order varies by type: URL → Type·URL·Added·Last updated·Words; File → Type·Added·Words·Size; Text → Type·Added·Words; Document → Type·Added·Words·Source doc. `timeAgo` uses full words (e.g. "3 minutes ago", not "3m ago").
5. **History** (`/document/:id/history`) — snapshot list left, version detail + MarkdownPreview middle, sharing & comments right. ContextBar actions: Share this version / Revoke (variant: 'default', left; conditional on share token) · Copy link (variant: 'default'; disabled when no snapshot selected or no share token; shows "Copied ✓" for 3s via `copyStatus` state) · Restore this version (variant: 'primary', right). All disabled when no snapshot selected. VERSION and COMMENTS panel headers are label-only. No URL input bar in the COMMENTS panel — copy is done via the ContextBar button.
6. **Images** (`/document/:id/images`) — image list left, image detail right. ContextBar action order: Copy URL · Delete · Upload Image (primary). Copy URL and Delete disabled when no image selected. Copy URL shows "Copied ✓" for 3s via `copyStatus` state (`'idle'`/`'copied'`); writes `![filename](/api/documents/{doc_id}/images/{filename})` to clipboard. Delete uses inline confirmation bar pattern. IMAGE DETAIL panel header label-only (shows filename or "Image Detail"). Selected image fetched as blob (auth header) → `createObjectURL`. Backend: `backend/images.py` — PNG/JPG/GIF/WebP only, 5 MB limit, storage at `/var/speedwrite/documents/{user_id}/{doc_id}/images/`. Document delete also removes the images directory. Filenames URL-encoded in all API paths (`encodeURIComponent` on filename segment only). `MarkdownPreview.jsx` renders `![…](/api/documents/…)` images via `AuthImage` (same fetch-as-blob pattern).
7. **Account** (`/account`) — no ContextBar. Sections: Usage (model name; actions used/remaining for non-BYOK users) · Profile · Change email · Change password · Anthropic API Key · Delete account — each an independent form with inline success/error. Usage section is read-only, derived from `user.ai_actions_used` and `FREE_ACTION_CAP`. All buttons use `Button.jsx` (no hand-rolled styles). No `<h1>` heading inside the content area — page title is in TopBar via `pageTitle`. BYOK "Save" button label is "Save key".
8. **ResetRequest** (`/reset-password/request`) — unauthenticated. Always returns 200 (does not reveal whether email exists).
9. **ResetConfirm** (`/reset-password/confirm?token=…`) — unauthenticated. Token read from URL query param.
10. **SharedView** (`/shared/:token`) — unauthenticated, no TopBar/ContextBar. Left: document title, snapshot label + timestamp, rendered markdown. Right: comment list + submission form (name + body). Shows 404 if token not found.
11. **Admin** (`/admin`) — read-only admin interface. Auth required; renders "Access denied" if `user.is_admin` is false (backend also enforces 403). To grant access, set `"is_admin": true` on the user record in `users.json` directly — no UI for this. TopBar dropdown shows an "Administration" link when `user.is_admin` is true.

`ErrorBoundary.jsx` wraps the router and each page route in `App.jsx` — two levels, so a crash in one page doesn't block navigation.

## AI Features

- **Agent panel**: AI can propose document changes in any message. `<proposed_document>` block triggers diff view. Chat panel is hidden via `display: none` (not unmounted) so ref and chat state survive the reject path — `className={pendingProposal ? 'hidden' : 'contents'}`.
- **Inline diff** (`DiffView.jsx`): LCS-based. Auto-scrolls to first change on mount. Occupies the same flex slot as the editor.
- **"Add to chat" button**: On tree node hover (hidden for protected headings). Calls `chatPanelRef.current.prefillRewrite(sectionContent, headingText)` — sets section content as context attachment and focuses the input, but does not prefill any text.
- **Context scoping**: When context is attached, AI is instructed to change only that section and return the full document with only that part replaced. `ignore_history: true` is set whenever context is attached.
- **Content override safety**: `editorContentOverride` in `Document.jsx` is a one-shot signal. `onContentOverrideApplied` fires immediately after `Editor.jsx` applies it to clear it back to `null`.
- **Document actions routing (important)**: Only `Home.jsx` description generation calls `api.documentAction` (action: `generate_description`). After generation, `Home.jsx` persists the result via `api.updateDocument({ description })`. `DocumentUpdate` accepts an optional `description` field; `documents.py` sets it when present. All other AI chat in `ChatPanel` goes through `api.chatMessage` → `chat.py` — never `actions.py`. Both `generate_description` and the evidence describe endpoint return structured four-section markdown (Summary / Key themes / Key arguments / Open questions, 3–5 single-line bullets each) — rendered by a hand-rolled parser, not `MarkdownPreview`.
- **Evidence describe**: `POST /documents/{doc_id}/evidence/{evidence_id}/describe` — generates the same four-section structured description for an evidence source. Stored as `item["description"]` on the evidence item. `EvidenceItemFull` Pydantic model has `description: Optional[str] = None`. Cap enforced (free users). `SourceDetail` lower panel renders the description via the same hand-rolled parser; shows "No description yet." when absent. Describe button in Evidence ContextBar: disabled when no item selected or describe in progress.
- **Evidence base**: File uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, other documents. URL sources carry `last_fetched_at` and `last_fetch_error`. `POST .../evidence/{id}/refresh` updates content and re-embeds on success. Duplicate URL detection shows amber banner in SourceDetail.
- **Embeddings/RAG**: Embedded via Ollama `nomic-embed-text`. At chat time, if total non-live evidence > 8000 chars and embeddings exist, top-5 chunks retrieved instead of full context dump. Per-source RAG preflight in ChatPanel/EvidenceChatPanel: `api.ragQuery` → `POST .../evidence/{id}/rag-query`; if `used_rag: true`, chunks replace context. Falls back silently if Ollama unreachable.
- **LLM abstraction** (`llm.py`): `complete()` routes to `_complete_anthropic` or `_complete_ollama`. Anthropic is the only active path. `_complete_ollama()` is retained but dormant — no UI toggle and `LLM_PROVIDER`/`OLLAMA_CHAT_MODEL` are commented out in `.env.example`. `config.py` and `ProviderToggle.jsx` have been deleted. Active model: `FREE_MODEL = "claude-haiku-4-5-20251001"` (module-level constant). Sonnet string retained as a comment for Sprint 2 plan-based routing.
- **Evidence chat** (`EvidenceChatPanel.jsx`): Persistent chat on Evidence page. "All sources" option concatenates all sources. `ignore_history: true` when context attached. Backend: `POST /documents/{doc_id}/evidence-chat` in `evidence_chat.py`. Never modifies the document.
- **Token limits**: `max_tokens=4096` in `chat.py` and `actions.py`. Large attachments can still cause truncation if total prompt + response exceeds model context window.
- **Document export**: `GET .../export/txt` strips markdown to plain text. `GET .../export/pdf` uses `markdown` + `weasyprint`. Both auth-required, filename-sanitised. Frontend: `api.downloadExport` fetches as blob, extracts filename from header, triggers download via temporary `<a>`.
- **Document import**: `POST /documents/import` (multipart, auth required). Accepts `.docx` only (400 otherwise). Converts via mammoth → html2text; falls back to raw text if html empty. Title from filename, truncated to 200 chars. Route must be defined before `/{doc_id}` routes in `documents.py` (ordering constraint). Dependencies: `mammoth==1.8.0`, `html2text==2024.2.26`.
- **Global search**: `POST /search` — searches titles, content, evidence, chat history (not evidence_chat_history); ≤5 results per group. `SearchOverlay.jsx` triggered by Cmd/Ctrl+K or search icon. Evidence results navigate to Evidence view with `{ state: { evidenceId } }`; `Evidence.jsx` pre-selects on load via `initialSelectDoneRef` (one-shot).

## Document Tree

- **"Add to chat"** button on hover (hidden for protected headings and during diff view). Attaches section as context; input left empty for the user to type their request.
- Protected nodes show lock icon; unlocked nodes show it faintly on hover. Both the per-section lock/unlock icon and the structure lock toggle in the Structure panel header are hidden during diff view.
- During diff view (`pendingProposal` truthy), a `pendingProposal` boolean is threaded `Document.jsx` → `DocumentSidebar.jsx` → `DocumentTree.jsx` to suppress all three interactive controls; tree content remains fully visible.
- Clicking heading scrolls editor to it via `useImperativeHandle` on Editor.
- No `##` headings → DocumentSidebar shows placeholder. `parseHeadings` is exported from `DocumentTree.jsx`.

## Edit/Preview Toggle

- `SegmentedControl` in the Document page ContextBar `rightControls`. Not rendered (hidden entirely) when `pendingProposal` is truthy.
- `Editor.jsx` no longer contains the toggle or `onEditorModeChange` prop — it receives `editorMode` read-only.

## Editor Autosave

- Autosave runs 1 s after each keystroke. No timestamp or status is shown in the panel header during normal operation.
- On failure, a thin red error bar (`bg-red-50 / border-red-200 / text-red-600`) appears below the Editor panel header. It clears automatically on the next successful save. No close button needed.
- `onSaveStatus` callback (called with `'Saving…'`, a timestamp string, or `''`) is still forwarded to the parent for the ContextBar "Save version" button status — it is not related to the error bar.

## Editor Find Bar

- Only available in edit mode when `pendingProposal` is falsy. Not shown in Preview or diff view.
- Triggered by magnifying glass button in Editor header or Ctrl+F / Cmd+F when textarea is focused.
- Enter / Shift+Enter navigate next/prev. Escape closes. Switching to Preview closes and resets.

## Chat Panel

- **Attachment**: `AttachmentPopup.jsx` (+ button). Section picker uses `parseHeadingsWithContent` from `Document.jsx`; evidence picker uses `doc.evidence`. Popup closes on outside click or Escape.
- **Context chip**: shows label + char count. Amber styling + `⚠` when truncated. Hard truncation at 6000 chars (`ATTACHMENT_TRUNCATION_LIMIT`). `originalLength` stored pre-truncation. `AttachmentPopup` passes raw content — truncation all happens in `ChatPanel`.
- **Context priority**: `localContext` (popup) takes priority over `contextText` prop (editor selection). `contextText` being set clears `localContext`. Both cleared on send.
- **Context label**: stored in `chat_history` as `context_label` on user entries. User messages with a label show a small tag above the bubble, right-aligned.
- **forwardRef**: `ChatPanel` exposes `appendMessages(userMsg, assistantMsg)` and `prefillRewrite(content, heading)` via `useImperativeHandle`.
- **Stop button**: replaces Send while request in flight. Calls `AbortController.abort()`; `AbortError` caught silently. `api.js` `request()` accepts optional `signal`.
- **Single Send button**: Only a Send button — no Edit/Chat split. All messages go through the same path. AI decides whether to return a `<proposed_document>` block based on the request. `_build_mode_instruction()` in `chat.py` instructs: return `<proposed_document>` for change requests, respond conversationally for questions. `mode` field removed from `ChatRequest` and `api.chatMessage`.
- **Preserve instruction** (`_PRESERVE_INSTRUCTION` in `chat.py`): prepended as the first block of the system prompt. Instructs the AI to return markdown tables, image references, fenced code blocks, and blockquotes verbatim in any proposed document. Not used in `actions.py` — `generate_description` returns plain prose, not a proposed document.
- **Enter key**: configurable via `localStorage` (`speedwrite_submit_on_enter`). Send button uses `onClick={() => handleSend()}` — not `onClick={handleSend}` — to prevent the click event being passed as `textOverride`. `EvidenceChatPanel` follows the same pattern.
- **onActionComplete**: Optional callback prop (default `null`) on both `ChatPanel` and `EvidenceChatPanel`. Called after each successful AI response (fire-and-forget). Pages pass `() => { api.me().then(setUser).catch(() => {}) }` to keep `user` state current for cap enforcement.
- **Empty assistant bubbles**: The assistant message bubble is not rendered at all when `msg.content?.trim()` is falsy — avoids a visible empty bubble while a response is being constructed or when content is whitespace-only. Applies to both `ChatPanel` and `EvidenceChatPanel`.

## Document History

- Snapshots: `history: list` on doc JSON; max 50 (oldest dropped). Auto-snapshot every 10 saves.
- Four triggers: `auto`, `rewrite`, `restore`, `manual`.
- Each snapshot entry has: `id`, `timestamp`, `trigger`, `label`, `content`, `share_token` (string|null), `comments` (list). `share_token` and `comments` initialised in `add_snapshot()`; existing snapshots without them degrade safely via `.get()`.
- `POST /documents/{doc_id}/snapshot` — body `{ label, trigger }`. Returns new entry.
- `GET /documents/{doc_id}/history` — list newest-first, strips to `id`, `timestamp`, `trigger`, `label`, `is_shared` (bool), `comment_count` (int). No `content` or `share_token` in list.
- `GET /documents/{doc_id}/history/{snapshot_id}` — full snapshot with content, share_token, comments.
- Restore flow: History.jsx navigates to `/document/:id` with `{ state: { restoreContent, restoreSnapshotId, restoreSnapshotLabel } }`. `Document.jsx` reads this on load, sets `pendingProposal`, sets `pendingProposalReason: 'restore'`, clears location state via `window.history.replaceState`. Accept → `trigger='restore'` snapshot created; Reject → unchanged.
- `pendingProposalReason`: `'ai_rewrite'` (default) or `'restore'`. Controls snapshot trigger in `handleAccept`. Reset to `'ai_rewrite'` after accept.

## Version Sharing

Sharing is tied to History snapshots (immutable), not to the live document. Anyone with a share link can view the snapshot and leave a comment (name + body). The document owner can delete comments.

- **Backend**: `backend/sharing.py` — registered last in `main.py` (no prefix).
- **Share/unshare**: `POST .../share` (idempotent — returns existing token if already set). `POST .../unshare` sets `share_token = None`.
- **Public read**: `GET /shared/{token}` — no auth. Scans all users' documents via `load_users()` + `list_documents()`. Returns `doc_title`, `label`, `timestamp`, `content`, `comments`.
- **Public comments**: `POST /shared/{token}/comments` — no auth; sets `is_owner: False`. `DELETE .../comments/{comment_id}` — auth required; 404 if not found.
- **Owner comments**: `POST .../comments` — auth required; name derived from `display_name || email`; sets `is_owner: True`.
- **`is_owner` field**: present on all new comments; old entries without it default to `False` via `.get()`. Owner comments get distinct styling + "Owner" badge in both History.jsx and SharedView.jsx.
- **Share URL**: `window.location.origin + '/shared/' + token` — never hardcoded to a domain.
- **History.jsx COMMENTS panel**: label-only header. `comment_count` in snapshot list state updated optimistically on add/delete.

## Feedback

- **Trigger**: `onFeedbackClick` prop on `TopBar`. All pages pass `() => setShowFeedback(true)`.
- **UI**: `FeedbackBar.jsx` — slim bar rendered below TopBar. Single text input (maxLength 2000), Send button, × close. Escape also closes. Auto-closes 2s after successful send.
- **Backend**: `POST /feedback` in `backend/feedback.py`, auth required. Sends email via `mailer.send_email()` to `FEEDBACK_EMAIL` (env var, defaults to `EMAIL_FROM`). Always returns `{"ok": true}` — email failures are logged but not surfaced to the user.
- **`mailer.py`** named to avoid shadowing Python's stdlib `email` module — applies to all of `mailer.py`, not just feedback.
- **`FEEDBACK_EMAIL`** env var: optional; defaults to `EMAIL_FROM` if not set.

## Section Locking

- `protected_sections: list` on doc stores locked heading texts.
- Backend enforces via system prompt in `chat.py` (`_build_protected_block`) — AI instructed never to modify or offer to unlock locked sections.
- `POST /documents/{doc_id}/protect` adds; `DELETE` removes.
- Frontend: optimistic update with error revert in `Document.jsx`. `DocumentTree.jsx` shows lock icons on protected nodes. `MarkdownPreview.jsx` and `DiffView.jsx` both highlight protected blocks visually.

## Structure Locking

Separate and independent from per-section locking. Prevents AI from changing document structure (add/remove/reorder/rename sections) while allowing content rewrites.

- `structure_locked: bool` on doc (default `False`). `doc.get('structure_locked', False)` for existing docs.
- `POST /documents/{doc_id}/lock-structure` and `POST .../unlock-structure`.
- Instruction text injected into `chat.py` `scope_instruction` and `actions.py` system prompt: *"The document structure is locked. Do not add, remove, reorder, or rename any sections. Rewrite the content within sections freely, except where individual sections are also locked. Locks are constraints — always proceed with the rewrite, doing as much as permitted."*
- UI: icon-only toggle in Structure panel header. No visual treatment on tree nodes — avoids collision with per-section lock styling.
- When `structureLocked` is true, heading lines highlighted in both `DiffView` and `MarkdownPreview`.
- `MarkdownPreview.jsx` uses `react-markdown` + `remark-gfm`. Protected and structure-lock highlighting applied via custom `components` renderers using `node.position.start.line` (1-indexed, converted to 0-indexed to match `getProtectedLineSet`). `dangerouslySetInnerHTML` removed.
- `ChatPanel` receives and forwards `structureLocked` on every message sent via `handleSend`.

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
| `/var/speedwrite/documents/{user_id}/{doc_id}/images/` | Uploaded images |
| `/var/speedwrite/embeddings/{user_id}/{doc_id}.json` | Chunked embeddings for all evidence sources |

The local dev named volume is `dev_speedwrite_data` — Docker Compose prefixes it with the project name, so the actual volume is `speedwrite_dev_speedwrite_data`. It mounts to `/var/speedwrite` in `docker-compose.override.yml`.

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
| `LLM_PROVIDER` | Dormant — commented out in `.env.example`. |
| `OLLAMA_CHAT_MODEL` | Dormant — commented out in `.env.example`. |

## Ollama Setup

Ollama runs outside Docker. `ollama pull nomic-embed-text` is required for embeddings/RAG. Embeddings always attempted via Ollama regardless of `LLM_PROVIDER`. If unreachable, skipped silently and RAG falls back to full context dump.

## Running Locally

```bash
cp .env.example .env   # populate JWT_SECRET and ANTHROPIC_API_KEY
docker compose up --build
```

App: http://localhost · Backend API: http://localhost:8000 · Docs: http://localhost:8000/docs

## Deploying to Production

```bash
bash bootstrap.sh   # first time only — set EMAIL inside the script first
bash deploy.sh      # subsequent deploys
```

**Warning:** `docker-compose.override.yml` must never run in production. `deploy.sh` explicitly passes `-f docker-compose.yml` to prevent Docker Compose from auto-merging it.

## Monetisation

### Sprint 1 scaffolding
- **Plan field**: `plan: str = "free"` on `UserOut` and written on register. Defaults safely via `.get("plan", "free")`.
- **Model**: All users on `FREE_MODEL` (`claude-haiku-4-5-20251001`). `PAID_MODEL = "claude-sonnet-4-20250514"` is defined in `llm.py` for Sprint 2.
- **Evidence limit**: `FREE_EVIDENCE_LIMIT = 50` — defined in `backend/limits.py`. All four add-evidence endpoints enforce it with HTTP 400.

### Sprint 2 — BYOK (Bring Your Own Key)
- Users add their Anthropic API key in Account settings. BYOK users get `PAID_MODEL` (Sonnet); free users get `FREE_MODEL` (Haiku). See Auth section for encryption and endpoint details.
- Frontend: `Account.jsx` shows input (no key) or masked key + Remove button. `api.saveByokKey` / `api.removeByokKey` in `api.js`.

### Sprint 3 — AI action cap
- **Limits module**: `backend/limits.py` holds `FREE_ACTION_CAP` and `FREE_EVIDENCE_LIMIT`. `frontend/src/constants/limits.js` exports `FREE_ACTION_CAP` for the frontend.
- **Counter fields**: `ai_actions_used` (int) and `ai_actions_reset_at` (ISO string) on the user record. `GET /auth/me` returns both. `get_actions_used(user)` in `auth.py` returns the count, resetting to 0 if the stored month differs from now. `increment_action_count(user_id)` reloads users, resets if stale, increments, and saves.
- **Cap enforcement**: `chat.py`, `evidence_chat.py`, and `actions.py` check cap before calling `complete()` (free users only — BYOK users bypass). Returns HTTP 429 with message `"Monthly limit of {FREE_ACTION_CAP} AI actions reached…"`. `increment_action_count` is called after each successful `complete()`.
- **Frontend cap UI**: `ChatPanel` and `EvidenceChatPanel` accept `actionsUsed` and `hasByokKey` props. When capped: Send button disabled with tooltip, amber banner shown above input with link to Account settings. 429 cap errors are displayed as plain assistant messages (no "Error:" prefix).
- **Usage display**: Model name and action counts shown in the Usage section of `Account.jsx` (not in TopBar).
- **Stale counter cleanup**: `cleanup.py` runs `reset_stale_action_counters()`, which zeroes `ai_actions_used` for any user whose `ai_actions_reset_at` is from a prior month.

## Maintenance

`backend/cleanup.py`: `clear_expired_reset_tokens()` and `reset_stale_action_counters()`. Runs from `__main__`. Installed as a daily cron by `bootstrap.sh`:
```
0 3 * * * docker exec speedwrite-app python cleanup.py >> /var/log/speedwrite-cleanup.log 2>&1
```

## Layout Constraints

`#root` in `index.css` has `min-width: 1024px` — the browser shows a horizontal scrollbar if the window is narrower. The layout is not designed to be responsive below this width.

## Key Commands

```bash
docker compose logs -f app       # backend logs
docker compose logs -f nginx     # nginx logs
docker compose restart app       # restart backend
docker compose up --build -d     # rebuild everything
```
