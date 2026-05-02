# SpeedWrite — Claude Code Context

## Project Overview

SpeedWrite is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

## Intentional Removals

### Audit Log removed (do not re-add)

The Audit Log feature (`log.py`, `Log.jsx`, `append_audit_log`, `addLogEntry`, `/document/:id/log` route) was removed intentionally. It is an audit trail, not a user-facing document authoring feature. Do not re-add audit logging or a Log tab to SpeedWrite.


### Redraft and Insights removed (do not re-add)

The Redraft and Insights dropdowns in `ChatPanel` and `EvidenceChatPanel` were removed intentionally. `insightPrompts.js` and related constants are gone; `InstructionBar.jsx` is kept in repo but unused. Do not re-add these dropdowns.

### Templates removed (do not re-add)

The templates feature (`backend/templates.py`, `TemplatePickerOverlay.jsx`, `frontend/src/data/templates.js`, `/templates` API routes, "From template…" on Home, "Save as template" on Document) was removed intentionally. Do not re-add document templates or a template picker.

### "Add to chat" retired (do not re-add)

The "Add to chat" button (arbitrary text selection in Edit mode) was retired when sectional editing was introduced. The `+` section picker in `ChatPanel.jsx` is the only scope declaration mechanism. Do not re-add "Add to chat", `selectedText` state, `contextText` prop, or `onSelectText` plumbing.

### Per-section locking removed (do not re-add)

Per-section locks (`protected_sections`, `_build_protected_block`, `protectSection`/`unprotectSection` endpoints, lock icons in `DocumentTree`) were removed when sectional editing made them redundant. Scope is now opt-in via section attachment — the user explicitly declares what gets rewritten. Do not re-add `protected_sections`, per-section lock UI, or `_build_protected_block`. Structure locking remains and is unaffected.

## UI Conventions

### Three-tier navigation hierarchy

**Tier 1 — Global bar (TopBar):** Always visible. Dark background; dropdown menu stays white. SpeedWrite logo links to `/home`. When `showBack={true}` (Document, Evidence, History, Images, Account, Admin), a `←` ghost-style icon button renders instead of the logo and navigates to `/home` on click — renders immediately on mount without waiting for `docTitle` to load. User dropdown: "Give feedback" (when `onFeedbackClick` provided) · "Administration" (admins only) · "Account settings" · "Sign out"; closes on outside click or Escape. `pageTitle` is for non-document pages; `docTitle` takes priority if both are set.

**Tier 2 — Page context bar (ContextBar):** Below the global bar. Left side: tab navigation (Document / Evidence / History); active tab uses a 2px bottom border flush with the bar bottom (all tabs carry a transparent border to prevent layout shift; inactive hover shows a light border). Right side: page-specific action buttons (outlined). ContextBar accepts a `tabs` prop: `[{ label, active, onClick }]`. Action objects support `disabled: true` and `title` (native tooltip). The optional `controls` prop renders between the tabs and the actions group. The optional `rightControls` prop renders inside the actions flex row, to the left of the action buttons. The optional `overflow` prop takes the same action-object shape; a ghost `MoreVertical` icon button renders at the far right, opening a dropdown for secondary actions. Menu closes on item click, outside click, or Escape. Per-page action inventories are in App Architecture below.

**Tier 3 — Panel headers:** Slim headers, label uppercase small caps left-aligned, panel-specific actions right-aligned.

### Control type rules

- **All buttons** use `Button.jsx` (variants: primary/secondary/danger/ghost) or `ContextBar.jsx` action objects. Do not hand-roll button styles.
- **ContextBar actions** (Tier 2): use action objects with variant 'primary', 'danger', or 'default'. Default renders as secondary style.
- **Panel header buttons** (Tier 3): use `<Button variant="secondary" size="sm">` for standard actions, `<Button variant="primary" size="sm">` for the primary action on a panel.
- **Dropdown triggers** (`ActionsDropdown.jsx`): styled to match Button.jsx secondary.
- **Segmented controls** (`SegmentedControl.jsx`): active = near-black, inactive = gray.
- **Icon buttons** (e.g. find bar magnifying glass, TopBar search): ghost style (no bg/border).
- Delete buttons in the ContextBar use variant: 'default' (secondary grey) when an inline confirmation bar follows — the confirmation bar itself carries the danger colour. The danger variant is reserved for destructive actions with no separate confirmation step. Primary actions always near-black; everything else secondary grey. Primary actions rightmost among buttons; overflow menu icon, if present, sits right of the primary.

### General principles
- Labels left, actions right — they never compete
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
│   │   └── InstructionBar.jsx   # Unused — kept in repo
│   ├── constants/
│   │   ├── attachmentLimits.js  # ATTACHMENT_TRUNCATION_LIMIT and ATTACHMENT_WARNING_THRESHOLD (both 10000)
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

1. **Landing** (`/`) — public, unauthenticated, no TopBar/ContextBar. Logout and account-delete both redirect here.
2. **Library** (`/home`) — document list left, document detail right. ContextBar action order: Import · Describe · Rename · Duplicate · Delete · Open · New Document. Import always enabled (triggers hidden file input accepting `.docx`, `.md`, `.txt`). New Document always enabled (primary when no document selected; Open is primary when one is). Describe fires `generate_description` action; shows Describing…/Described ✓ (3s reset); disabled when no document selected or status ≠ idle. Rename/Duplicate/Delete/Open disabled when no document selected. Delete sets `pendingDelete` (inline confirmation bar). Duplicate prepends the new doc and selects it (no navigation). Import/duplicate errors surface in shared error bar. DOCUMENT DETAIL panel: rename input uses Enter/Escape/onBlur only — no ✓/✕ buttons. Structured description rendered via hand-rolled parser (not `MarkdownPreview`).
3. **Document** (`/document/:id`) — tree left, editor middle, AI chat right. ContextBar right side (all in `rightControls`): Edit/Preview toggle · Save version (shows Saving… / Saved ✓ with 3s reset; disabled while saving) · Save as welcome (admin only; same Saving…/Saved ✓ pattern; hidden when `!user?.is_admin`) · Export ▾ (`.txt`/`.md`/`.pdf`). None rendered when proposal pending, which replaces them with Accept (variant: 'primary') · Reject action buttons.
4. **Evidence** (`/document/:id/evidence`) — source list left, source detail middle, EvidenceChatPanel right. ContextBar action order: Describe · Update source · Update all sources · Reindex · Delete · Add source (primary, rightmost, always enabled). No overflow menu. Update source: shows Updating…/Updated ✓ (3s; disabled for non-URL/doc sources; tick resets on selection change). Update all sources: same ✓ pattern; disabled when no URL/doc sources; reverts to idle if all fail. Reindex: shows Reindexing…/Reindexed ✓. Delete disabled when no source selected; confirmation bar uses plain text buttons. `EvidenceSidebar` is label-only — no buttons, no "+ Add Source". Each item has a checkbox (active = filled, inactive = muted); checkbox click toggles `item.active` via `api.updateEvidence` with optimistic update and revert. `SourceDetail` shows a key-value metadata list; "Last updated" reads from `last_fetched_at` for URL/document types and is omitted when absent.
5. **History** (`/document/:id/history`) — snapshot list left, version detail + MarkdownPreview middle, sharing & comments right. ContextBar actions: Share this version / Revoke (variant: 'default'; conditional on share token) · Copy link (disabled when no snapshot or no token; shows "Copied ✓" 3s) · Restore this version (variant: 'primary'). All disabled when no snapshot selected. Snapshot list: two-column layout (monospace timestamp left, label right). VERSION panel: metadata block (Label · Saved · Trigger · Shared · Comments) above `MarkdownPreview`. COMMENTS panel header is label-only. No URL input bar — copy done via ContextBar.
6. **Images** (`/document/:id/images`) — image list left, image detail right. ContextBar action order: Copy URL · Delete · Upload Image (primary). Copy URL and Delete disabled when no image selected. Copy URL shows "Copied ✓" for 3s; writes `![filename](/api/documents/{doc_id}/images/{filename})` to clipboard. Delete uses inline confirmation bar pattern. IMAGE DETAIL panel header: always "Image Detail" (never the filename). When an image is selected: metadata block (Filename · Size) above image using key-value style. Selected image fetched as blob (auth header) → `createObjectURL`. Backend: PNG/JPG/GIF/WebP only, 5 MB limit. Document delete also removes the images directory. Filenames URL-encoded in all API paths (`encodeURIComponent` on filename segment only).
7. **Account** (`/account`) — no ContextBar. Sections: Usage (model name; actions used/remaining for non-BYOK users) · Profile · Change email · Change password · Anthropic API Key · Delete account — each an independent form with inline success/error. All buttons use `Button.jsx` (no hand-rolled styles). No `<h1>` heading inside the content area — page title is in TopBar via `pageTitle`. BYOK "Save" button label is "Save key".
8. **ResetRequest** (`/reset-password/request`) — unauthenticated. Always returns 200 (does not reveal whether email exists).
9. **ResetConfirm** (`/reset-password/confirm?token=…`) — unauthenticated. Token read from URL query param.
10. **SharedView** (`/shared/:token`) — unauthenticated, no TopBar/ContextBar. Left: document title, snapshot label + timestamp, rendered markdown. Right: comment list + submission form (name + body). Shows 404 if token not found.
11. **Admin** (`/admin`) — read-only admin interface. Auth required; renders "Access denied" if `user.is_admin` is false (backend also enforces 403). To grant access, set `"is_admin": true` on the user record in `users.json` directly — no UI for this. TopBar dropdown shows an "Administration" link when `user.is_admin` is true.

`ErrorBoundary.jsx` wraps the router and each page route in `App.jsx` — two levels, so a crash in one page doesn't block navigation.

## AI Features

- **Sectional editing (Document chat)**: AI proposes changes only when the user attaches a section via the `+` picker. No attachment → chat-only, no diff view. The AI returns only the rewritten section in `<proposed_section>` tags; `chat.py` splices it back into the full document and returns the result as `proposed_content`. Diff/Accept/Reject runs on (original full doc, spliced doc) unchanged.
  - `ChatRequest.section_path: Optional[list[SectionPathStep]]` — `None` = chat-only; `[]` = entire doc; `[...]` = ancestor path (steps: `{text, index, level}`). `index` = 0-based count of prior same-text/same-level siblings under the same parent; `level` disambiguates same-text headings at different depths.
  - `_locate_section(content, path)` in `chat.py` finds section boundaries. Returns `(start_line, end_line)` or `None`.
  - Rewritten section includes the heading line (heading rename is within scope); splice replaces `lines[start:end]`.
  - `ignore_history: true` when section attached (including entire-document); `false` for chat-only.
  - Per-section lock check: if attached section heading is in `protectedSections`, an inline `system-notice` bubble is shown and no request is sent.
  - `context_label` is derived server-side from the leaf heading (or `"Entire document"`) and stored on the chat history entry.
- **Agent panel**: Chat panel is hidden via `display: none` (not unmounted) so ref and chat state survive the reject path — `className={pendingProposal ? 'hidden' : 'contents'}`.
- **Inline diff** (`DiffView.jsx`): LCS-based line diff. Auto-scrolls to first change on mount. Shares the editor's flex slot. Verbatim lines inside rewritten paragraphs render as unchanged context (muted) — correct line-level behaviour. Word/paragraph diff declined (cost > benefit). Protected rendering (muted grey, `~` gutter) applies only to `equal` lines — `add`/`remove` always render in standard livery regardless of protection.
- **Content override**: `editorContentOverride` in `Document.jsx` is a one-shot signal; `onContentOverrideApplied` clears it to `null` immediately after `Editor.jsx` applies it.
- **Document actions routing (important)**: Only `Home.jsx` description generation calls `api.documentAction`. All other AI chat goes through `api.chatMessage` → `chat.py` — never `actions.py`. Both `generate_description` and evidence describe return structured four-section markdown (Summary / Key themes / Key arguments / Open questions) — rendered by a hand-rolled parser, not `MarkdownPreview`.
- **Evidence describe**: `POST /documents/{doc_id}/evidence/{evidence_id}/describe` — generates the same four-section structured description for an evidence source. Stored as `item["description"]`. Cap enforced (free users). `SourceDetail` lower panel renders via the same hand-rolled parser; shows "No description yet." when absent. Describe button disabled when no item selected or describe in progress.
- **Evidence base**: File uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, other documents. URL sources carry `last_fetched_at` and `last_fetch_error`. `POST .../evidence/{id}/refresh` updates content and re-embeds. Duplicate URL detection shows amber banner. Each source has an optional `active` bool; toggled via `PATCH .../evidence/{id}`. Inactive sources are excluded from all AI context.
- **Embeddings/RAG**: Embedded via Ollama `nomic-embed-text`. At chat time, if total non-live evidence > 8000 chars and embeddings exist, top-5 chunks retrieved instead of full context dump. `retrieve_relevant_chunks` accepts `active_ids`; inactive-source chunks excluded. Falls back to full context dump if Ollama unreachable.
- **LLM abstraction** (`llm.py`): Anthropic is the only active path; `_complete_ollama()` is retained but dormant. Active model: `FREE_MODEL = "claude-haiku-4-5-20251001"`. `_complete_anthropic` catches status 529 → HTTP 503 with a user-facing message.
- **Evidence chat** (`EvidenceChatPanel.jsx`): Persistent chat on Evidence page. Never modifies the document. When no source is manually attached, `_build_evidence_block` auto-injects the full evidence base (same RAG/full-dump logic; inactive sources excluded). A source inventory is always prepended. Attached-context and auto-evidence paths are mutually exclusive. `DELETE .../evidence-chat` clears history. No "All sources" option. **Stale-context warning**: trash icon highlights if sources toggled since last send; clear to reset context.
- **Rewrite summary**: after the `</proposed_section>` block, AI writes a 1–3 sentence plain-text summary (becomes `clean_message`) describing what changed. Full-doc rewrites also note what was deliberately left unchanged and why. Chat-only path excluded.
- **Token limits**: `max_tokens=8192` in `chat.py`; `max_tokens=4096` in `actions.py`. Sectional rewrites use a fraction of this budget — truncation is not a concern at normal document sizes.
- **Document export**: `GET .../export/txt` strips markdown to plain text. `GET .../export/md` returns content as-is. `GET .../export/pdf` uses `markdown` + `weasyprint`. All auth-required. Frontend Export dropdown: `.txt` · `.md` · `.pdf`.
- **Document import**: `POST /documents/import` (multipart, auth). Accepts `.docx`, `.md`, `.txt`. `.docx` converts via mammoth → html2text. Title from filename, truncated to 200 chars. Route must precede `/{doc_id}` routes in `documents.py`.
- **Global search**: `POST /search` — searches titles, content, evidence, chat history; ≤5 results per group. `SearchOverlay.jsx` triggered by Cmd/Ctrl+K. Evidence results navigate to Evidence view with `{ state: { evidenceId } }`; pre-selected on load via `initialSelectDoneRef` (one-shot).

## Document Tree

- The structure lock toggle in the Structure panel header is hidden during diff view (`pendingProposal` prop in `DocumentSidebar.jsx`).
- Clicking a heading scrolls to it via `useImperativeHandle` on `Editor`. In edit mode: `scrollToHeading` mirrors into the textarea. In preview mode: `scrollToHeadingPreview` queries heading elements inside `previewContainerRef` and calls `scrollIntoView`. `Document.jsx` `onHeadingClick` branches on `editorMode`.
- No `##` headings → DocumentSidebar shows placeholder. `parseHeadings` is exported from `DocumentTree.jsx`.
- Tree has no left border; indentation alone carries hierarchy. Heading colour steps by level: H2 gray-700, H3 gray-600, H4+ gray-500. Each heading row carries `title={h.text}` for a native tooltip on truncated labels.

## Edit/Preview Toggle

- `SegmentedControl` in the Document page ContextBar `rightControls`. Not rendered (hidden entirely) when `pendingProposal` is truthy.
- `Editor.jsx` no longer contains the toggle or `onEditorModeChange` prop — it receives `editorMode` read-only.
- Mode is persisted to `localStorage` under the key `editorMode:{docId}` and restored on load. Default when no saved value: `'preview'` if `content.trim().length > 50`, `'edit'` otherwise. The 50-char threshold excludes stub content like `# Untitled\n\n` (the default for newly created documents) so new docs always open in Edit.

## Editor Autosave

- Autosave runs 1 s after each keystroke. No timestamp or status is shown in the panel header during normal operation.
- On failure, a thin red error bar appears below the Editor panel header. It clears automatically on the next successful save. No close button needed.
- `onSaveStatus` callback (called with `'Saving…'`, a timestamp string, or `''`) is still forwarded to the parent for the ContextBar "Save version" button status — it is not related to the error bar.

## Editor Find Bar

- Only available in edit mode when `pendingProposal` is falsy. Not shown in Preview or diff view.
- Triggered by magnifying glass button in Editor header or Ctrl+F / Cmd+F when textarea is focused.
- Enter / Shift+Enter navigate next/prev. Escape closes. Switching to Preview closes and resets.

## Chat Panel

- **Attachment**: The `+` button opens a section picker inlined in `ChatPanel.jsx`. The picker shows "Entire document" at the top (always), then H1–H3 headings filtered by a search input. Each heading carries a `path: {text, index, level}[]` field (ancestor path computed by `parseHeadingsWithContent` in `Document.jsx`). Closes on item select / outside click / Escape. Evidence is auto-injected into the system prompt; per-message evidence attachment is not offered. `AttachmentPopup.jsx` is NOT used by `ChatPanel` — it is used only by `EvidenceChatPanel`. **`document` prop shadowing**: `ChatPanel` receives a prop named `document` (the SpeedWrite document object) which shadows the browser global. Any `addEventListener`/`removeEventListener` calls must use `window.document`, not `document`.
- **Context chip**: shows attached section label + char count. Amber + `⚠` when truncated. Hard truncation at 10000 chars (`ATTACHMENT_TRUNCATION_LIMIT`); amber warning at 10000 (`ATTACHMENT_WARNING_THRESHOLD`). Section content is truncated client-side in `ChatPanel`.
- **Context label**: derived server-side from the leaf of the ancestor path (or `"Entire document"`) and stored as `context_label` on the user chat history entry. Frontend reads `msg.context_label` from history unchanged — shown as a small tag above the user bubble.
- **Single Send button**: no Edit/Chat split. Mode is signalled by `section_path` — `null` = chat-only (AI must not propose changes); otherwise rewrite mode.
- **Preserve instruction** (`_PRESERVE_INSTRUCTION` in `chat.py`): prepended to system prompt; instructs AI to return tables, image refs, code blocks, and blockquotes verbatim. Not used in `actions.py`.
- **Enter key**: configurable via `localStorage` key `speedwrite_submit_on_enter`. Send button uses `onClick={() => handleSend()}` (not `onClick={handleSend}`) to prevent the click event being passed as `textOverride`.
- **onActionComplete**: optional prop on both panels; called after each successful response to refresh `user` state for cap enforcement.
- **Auto-scroll**: `isFollowingRef` tracks whether the user is at the bottom. Scroll handler sets it `true` near-bottom (< 100px), `false` when scrolled up. `[messages, loading]` effect scrolls only when following. `scrollToBottom` (↓ Latest button) resets to `true`.
- **Clear chat**: trash icon ghost button in panel header; calls `DELETE /documents/{doc_id}/chat` (or `/evidence-chat`), resets local `messages` to `[]`. No confirmation.
- **Empty assistant bubbles**: bubble not rendered when `msg.content?.trim()` is falsy — prevents visible empty bubble during response construction.
- **MarkdownPreview variant**: assistant bubbles use `variant="chat"`. The `variant` prop (`'document'` default | `'chat'`) controls heading scale, margins, outer wrapper, and whether lock highlighting fires. Chat variant: compact headings, no outer wrapper div, no lock highlighting. Do not use the document variant in chat bubbles.

## Document History

- Snapshots: `history: list` on doc JSON; max 50 (oldest dropped). Auto-snapshot every 10 saves. Four triggers: `auto`, `rewrite`, `restore`, `manual`.
- `GET .../history` — list newest-first; no `content` or `share_token` in list response.
- Restore flow: History.jsx navigates to Document with `{ state: { restoreContent, restoreSnapshotId, restoreSnapshotLabel } }`; Document.jsx reads on load, sets `pendingProposal` + `pendingProposalReason: 'restore'`, clears location state via `window.history.replaceState`. Accept → `trigger='restore'` snapshot created; Reject → unchanged.
- `pendingProposalReason`: `'ai_rewrite'` (default) or `'restore'`. Controls snapshot trigger in `handleAccept`.

## Version Sharing

Sharing is tied to History snapshots (immutable). Anyone with a share link can view the snapshot and leave a comment (name + body). The document owner can delete comments.

- **Backend**: `backend/sharing.py` — registered last in `main.py` (no prefix).
- **Share/unshare**: `POST .../share` (idempotent). `POST .../unshare` sets `share_token = None`.
- **Public read**: `GET /shared/{token}` — no auth. Scans all users' documents.
- **Comments**: public `POST /shared/{token}/comments`; owner `POST .../comments` (auth, name from `display_name || email`); `DELETE .../comments/{comment_id}` auth required. `is_owner` field on comment; owner comments get distinct styling + "Owner" badge.
- **Share URL**: `window.location.origin + '/shared/' + token` — never hardcoded.
- **History.jsx COMMENTS panel**: label-only header. `comment_count` updated optimistically.

## Feedback

- **Trigger**: `onFeedbackClick` prop on `TopBar`. All pages pass `() => setShowFeedback(true)`.
- **UI**: `FeedbackBar.jsx` — slim bar rendered below TopBar. Single text input (maxLength 2000), Send button, × close. Escape also closes. Auto-closes 2s after successful send.
- **Backend**: `POST /feedback`, auth required. Email sent via `mailer.send_email()` to `FEEDBACK_EMAIL` (defaults to `EMAIL_FROM`). Always returns `{"ok": true}`; failures logged silently.
- **`mailer.py`** named to avoid shadowing Python's stdlib `email` module — applies to all of `mailer.py`, not just feedback.

## Structure Locking

Prevents AI from changing document structure (add/remove/reorder/rename sections) while allowing content rewrites within sections.

- `structure_locked: bool` on doc (default `False`). `doc.get('structure_locked', False)` for existing docs.
- `POST /documents/{doc_id}/lock-structure` and `POST .../unlock-structure`.
- Instruction in `chat.py` (`_build_structure_lock_block`): absolute prohibition on structural changes — cannot be overridden by user instructions. If the request requires a structural change, AI declines in plain text only (no `<proposed_section>` block) and explains the lock. Content rewrites proceed normally. Decline responses pass through as the assistant's chat reply (`clean_message`), not surfaced as errors.
- UI: icon-only toggle in Structure panel header. No visual treatment on tree nodes.
- When `structureLocked` is true, heading lines highlighted in `DiffView` and in `MarkdownPreview` (document variant only). Highlighting uses `node.position.start.line` (1-indexed → 0-indexed) in custom `components` renderers.
- `ChatPanel` receives and forwards `structureLocked` on every message sent via `handleSend`.

## Auth & Account Management

- **Password reset**: TTL 1 hour; always returns 200 (does not reveal whether email exists). SendGrid errors logged, not surfaced.
- **Change password / email / profile / delete account**: standard auth endpoints in `auth.py`. Delete uses `shutil.rmtree` on docs and embeddings dirs.
- **User record**: all optional fields use `.get()` for safe degradation. `is_admin` is set manually in `users.json` — no UI.
- **BYOK**: `GET /auth/me` returns `has_byok_key` and `byok_key_masked`. `get_byok_key(user)` returns decrypted key or `None` — raises HTTP 500 if stored but decryption fails.

## Welcome Document

When a new user registers, if `/var/speedwrite/welcome_document.md` exists, a copy is created as their first document. Title derived from the first H1 heading; falls back to "Getting Started". Silent skip if no template exists — registration never errors because of it.

- **`auth.py` registration**: builds a document dict inline after `save_users()`, then calls `save_document()`. Wrapped in bare `except` so template errors never surface to the registering user. No import from `documents.py` — avoids circular import.
- **`POST /documents/save-as-welcome`** (admin only): loads admin's document and writes to `WELCOME_TEMPLATE_PATH`. Must be defined before `/{doc_id}` routes in `documents.py`.
- **Frontend**: "Save as welcome" in Document ContextBar `rightControls`, visible only when `user?.is_admin`, hidden during diff view.

## Data Storage

JSON files on disk — no database.

| Path | Purpose |
|------|---------|
| `/var/speedwrite/users.json` | All user accounts |
| `/var/speedwrite/documents/{user_id}/{doc_id}.json` | Document data: content, evidence, chat history, protected sections, version history, save_count |
| `/var/speedwrite/documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |
| `/var/speedwrite/documents/{user_id}/{doc_id}/images/` | Uploaded images |
| `/var/speedwrite/embeddings/{user_id}/{doc_id}.json` | Chunked embeddings for all evidence sources |
| `/var/speedwrite/welcome_document.md` | Welcome document template (plain markdown; admin-set via Save as welcome) |

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

All three monetisation sprints are shipped. BYOK users get `PAID_MODEL` (Sonnet); free users get `FREE_MODEL` (Haiku). Free tier is capped at 1000 AI actions/month (`FREE_ACTION_CAP`) and 50 evidence sources (`FREE_EVIDENCE_LIMIT`) — abuse guards, not hard paywalls. Both constants live in `backend/limits.py`; `FREE_ACTION_CAP` is also exported from `frontend/src/constants/limits.js`.

- **BYOK**: users add their Anthropic key in Account settings. `get_byok_key(user)` in `auth.py` returns decrypted key or `None`; all LLM call sites pass it to `complete()`. Fernet encryption at rest via `ENCRYPTION_KEY`.
- **Cap enforcement**: `chat.py`, `evidence_chat.py`, and `actions.py` check cap before `complete()` (BYOK users bypass); HTTP 429 on breach. Count reset if stored month differs from now.
- **Frontend cap UI**: `ChatPanel`/`EvidenceChatPanel` accept `actionsUsed` + `hasByokKey`. When capped: Send disabled, amber banner with link to Account settings. 429 errors shown as plain assistant messages (no "Error:" prefix).
- **Usage display**: model name and counts in the Usage section of `Account.jsx` (not in TopBar).

## Maintenance

`backend/cleanup.py`: `clear_expired_reset_tokens()` and `reset_stale_action_counters()`. Runs from `__main__`. Installed as a daily cron by `bootstrap.sh`:
```
0 3 * * * docker exec speedwrite-app python cleanup.py >> /var/log/speedwrite-cleanup.log 2>&1
```

## Panel Resizing

Document, Evidence, History, and Images pages have draggable gutters (`ResizableGutter.jsx`) between panels.

- **Gutter**: `side` prop `'left'` or `'right'`. `onResize(newWidth)` on every mousemove; `onResizeEnd(finalWidth)` on mouseup (pages write localStorage). `min`/`max` pre-computed by the calling page. Minimum: left sidebar 180 px; right panel 300 px; middle panel 300 px.
- **localStorage key**: `speedwrite_panel_widths_{pageKey}` where `pageKey` ∈ `document | evidence | history | images`. Stored as `{ left, right }` JSON (Images: `{ left }` only).
- **Defaults**: left sidebars 256 px; chat/right panels 380 px; History right 320 px; Images left 256 px.
- **Panel ownership**: `DocumentSidebar`, `EvidenceSidebar`, `ChatPanel`, and `EvidenceChatPanel` use `w-full` and are wrapped in a `style={{ width, flexShrink: 0 }}` div. **Do not re-add hardcoded width classes to these components.**
- **h-full requirement**: These four components must keep `h-full` on their outer divs — `flex-1` children collapse without it. Do not remove `h-full`.
- Middle panels use `flex-1 min-w-0`. Window resize does not recompute stored panel widths.

## Layout Constraints

`#root` in `index.css` has `min-width: 1024px` — the browser shows a horizontal scrollbar if the window is narrower. The layout is not designed to be responsive below this width.

## Key Commands

```bash
docker compose logs -f app       # backend logs
docker compose logs -f nginx     # nginx logs
docker compose restart app       # restart backend
docker compose up --build -d     # rebuild everything
```
