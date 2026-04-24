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

## UI Conventions

### Three-tier navigation hierarchy

**Tier 1 — Global bar (TopBar):** Always visible. Dark background; dropdown menu stays white. SpeedWrite logo links to `/home`. When `showBack={true}` (Document, Evidence, History, Images, Account, Admin), a `←` ghost-style icon button renders instead of the logo and navigates to `/home` on click — renders immediately on mount without waiting for `docTitle` to load. User dropdown: "Give feedback" (when `onFeedbackClick` provided) · "Administration" (admins only) · "Account settings" · "Sign out"; closes on outside click or Escape. `pageTitle` is for non-document pages; `docTitle` takes priority if both are set.

**Tier 2 — Page context bar (ContextBar):** Below the global bar. Left side: tab navigation (Document / Evidence / History); active tab uses a 2px bottom border flush with the bar bottom (all tabs carry a transparent border to prevent layout shift; inactive hover shows a light border). Right side: page-specific action buttons (outlined). ContextBar accepts a `tabs` prop: `[{ label, active, onClick }]`. Action objects support `disabled: true` and `title` (native tooltip). The optional `controls` prop renders between the tabs and the actions group. The optional `rightControls` prop renders inside the actions flex row, to the left of the action buttons — use this for dropdowns that must sit alongside action buttons. The optional `overflow` prop takes the same action-object shape as `actions`; when provided, a ghost-style `MoreVertical` icon button renders at the far right (right of the primary action button), opening a dropdown menu for secondary actions. Disabled overflow actions render in the menu with muted styling and do not fire onClick. Menu closes on item click, outside click, or Escape. The visible/overflow split is a per-page design decision based on frequency of use — less-frequently-used actions move to overflow to reduce clutter. Per-page action inventories are in App Architecture below.

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
3. **Document** (`/document/:id`) — tree left, editor middle, AI chat right. ContextBar right side (all in `rightControls`): Edit/Preview toggle · Add to chat (disabled when no text selected; primary when text selected) · Save version (shows Saving… / Saved ✓ with 3s reset; disabled while saving) · Save as welcome (admin only; same Saving…/Saved ✓ pattern; hidden when `!user?.is_admin`) · Export ▾ (`.txt`/`.md`/`.pdf`). None rendered when proposal pending, which replaces them with Accept (variant: 'primary') · Reject action buttons.
4. **Evidence** (`/document/:id/evidence`) — source list left, source detail middle, EvidenceChatPanel right. ContextBar action order: Describe · Update source · Update all sources · Reindex · Delete · Add source (primary, rightmost, always enabled). No overflow menu. Update source disabled unless a URL or document source is selected; shows Updating…/Updated ✓ (3s reset); disabled during in-progress and success phases; success state is scoped to the source that was refreshed — selecting a different source clears the tick immediately. Update all sources disabled when no URL or document sources exist; shows Updating…/Updated ✓ (3s reset); if every per-source refresh fails, reverts to idle without the tick. Reindex disabled when no items exist or reindexing is in progress; shows Reindexing…/Reindexed ✓. Delete disabled when no source is selected. Delete confirmation bar uses plain text buttons. `EvidenceSidebar` is label-only — no buttons in panel header, no "+ Add Source" button below it. Each list item has a checkbox (active = filled, inactive = empty) and title text; inactive sources render muted. Checkbox click toggles `item.active` via `api.updateEvidence` with optimistic update and revert on error; `stopPropagation` prevents row selection. Absence of `active` field treated as active (`item.active !== false`). `SourceDetail` shows a key-value metadata list (no badges/icons); row order and fields vary by type; "Last updated" reads from `last_fetched_at` for URL and document types and is omitted when absent. `timeAgo` uses full words (e.g. "3 minutes ago", not "3m ago").
5. **History** (`/document/:id/history`) — snapshot list left, version detail + MarkdownPreview middle, sharing & comments right. ContextBar actions: Share this version / Revoke (variant: 'default', left; conditional on share token) · Copy link (variant: 'default'; disabled when no snapshot selected or no share token; shows "Copied ✓" for 3s) · Restore this version (variant: 'primary', right). All disabled when no snapshot selected. Snapshot list items show label text only (no bold, no timestamp or shared/comment lines in the list). VERSION panel: metadata block (Label · Saved · Trigger · Shared if shared · Comments if >0) renders above the `MarkdownPreview`, using the same key-value style as SourceDetail. COMMENTS panel header is label-only. No URL input bar in the COMMENTS panel — copy is done via the ContextBar button.
6. **Images** (`/document/:id/images`) — image list left, image detail right. ContextBar action order: Copy URL · Delete · Upload Image (primary). Copy URL and Delete disabled when no image selected. Copy URL shows "Copied ✓" for 3s; writes `![filename](/api/documents/{doc_id}/images/{filename})` to clipboard. Delete uses inline confirmation bar pattern. IMAGE DETAIL panel header is always "Image Detail" (static, never the filename). When an image is selected: metadata block (Filename · Size) renders above the image using the same key-value style as SourceDetail. Selected image fetched as blob (auth header) → `createObjectURL`. Backend: PNG/JPG/GIF/WebP only, 5 MB limit. Document delete also removes the images directory. Filenames URL-encoded in all API paths (`encodeURIComponent` on filename segment only). `MarkdownPreview.jsx` renders `![…](/api/documents/…)` images via `AuthImage` (same fetch-as-blob pattern).
7. **Account** (`/account`) — no ContextBar. Sections: Usage (model name; actions used/remaining for non-BYOK users) · Profile · Change email · Change password · Anthropic API Key · Delete account — each an independent form with inline success/error. All buttons use `Button.jsx` (no hand-rolled styles). No `<h1>` heading inside the content area — page title is in TopBar via `pageTitle`. BYOK "Save" button label is "Save key".
8. **ResetRequest** (`/reset-password/request`) — unauthenticated. Always returns 200 (does not reveal whether email exists).
9. **ResetConfirm** (`/reset-password/confirm?token=…`) — unauthenticated. Token read from URL query param.
10. **SharedView** (`/shared/:token`) — unauthenticated, no TopBar/ContextBar. Left: document title, snapshot label + timestamp, rendered markdown. Right: comment list + submission form (name + body). Shows 404 if token not found.
11. **Admin** (`/admin`) — read-only admin interface. Auth required; renders "Access denied" if `user.is_admin` is false (backend also enforces 403). To grant access, set `"is_admin": true` on the user record in `users.json` directly — no UI for this. TopBar dropdown shows an "Administration" link when `user.is_admin` is true.

`ErrorBoundary.jsx` wraps the router and each page route in `App.jsx` — two levels, so a crash in one page doesn't block navigation.

## AI Features

- **Agent panel**: AI can propose document changes in any message. `<proposed_document>` block triggers diff view. Chat panel is hidden via `display: none` (not unmounted) so ref and chat state survive the reject path — `className={pendingProposal ? 'hidden' : 'contents'}`.
- **Inline diff** (`DiffView.jsx`): LCS-based. Auto-scrolls to first change on mount. Occupies the same flex slot as the editor.
- **Context scoping**: When context is attached, AI is instructed to change only that section and return the full document with only that part replaced. `ignore_history: true` is set whenever context is attached.
- **Content override safety**: `editorContentOverride` in `Document.jsx` is a one-shot signal. `onContentOverrideApplied` fires immediately after `Editor.jsx` applies it to clear it back to `null`.
- **Document actions routing (important)**: Only `Home.jsx` description generation calls `api.documentAction` (action: `generate_description`). After generation, `Home.jsx` persists the result via `api.updateDocument({ description })`. All other AI chat in `ChatPanel` goes through `api.chatMessage` → `chat.py` — never `actions.py`. Both `generate_description` and the evidence describe endpoint return structured four-section markdown (Summary / Key themes / Key arguments / Open questions, 3–5 single-line bullets each) — rendered by a hand-rolled parser, not `MarkdownPreview`.
- **Evidence describe**: `POST /documents/{doc_id}/evidence/{evidence_id}/describe` — generates the same four-section structured description for an evidence source. Stored as `item["description"]`. Cap enforced (free users). `SourceDetail` lower panel renders via the same hand-rolled parser; shows "No description yet." when absent. Describe button disabled when no item selected or describe in progress.
- **Evidence base**: File uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, other documents. URL sources carry `last_fetched_at` and `last_fetch_error`. `POST .../evidence/{id}/refresh` updates content and re-embeds on success. Duplicate URL detection shows amber banner in SourceDetail. Each source has an optional `active` bool (absence = active); toggled via `PATCH .../evidence/{id}`. Inactive sources are excluded from all AI context.
- **Embeddings/RAG**: Embedded via Ollama `nomic-embed-text`. At chat time, if total non-live evidence > 8000 chars and embeddings exist, top-5 chunks retrieved instead of full context dump. `retrieve_relevant_chunks` in `embeddings.py` accepts `active_ids`; chunks from inactive sources are excluded before scoring. `_build_evidence_block` derives `active_ids` from `other_sources` to enforce this. Per-source RAG preflight in ChatPanel/EvidenceChatPanel: `api.ragQuery` → `POST .../evidence/{id}/rag-query`; if `used_rag: true`, chunks replace context. Falls back silently if Ollama unreachable.
- **LLM abstraction** (`llm.py`): `complete()` routes to `_complete_anthropic` or `_complete_ollama`. Anthropic is the only active path. `_complete_ollama()` is retained but dormant — no UI toggle and `LLM_PROVIDER`/`OLLAMA_CHAT_MODEL` are commented out in `.env.example`. `config.py` and `ProviderToggle.jsx` have been deleted. Active model: `FREE_MODEL = "claude-haiku-4-5-20251001"` (module-level constant). Sonnet string retained as a comment for Sprint 2 plan-based routing. `_complete_anthropic` catches `anthropic.APIStatusError` with `status_code == 529` and raises HTTP 503 with a user-facing message — surfaces as a clean error in chat rather than an unhandled 500.
- **Evidence chat** (`EvidenceChatPanel.jsx`): Persistent chat on Evidence page. `ignore_history: true` when context attached. Backend: `POST /documents/{doc_id}/evidence-chat` in `evidence_chat.py`. Never modifies the document. When no source is manually attached, `_build_evidence_block` (imported from `chat.py`) is called automatically to inject the full evidence base into the system prompt — same RAG vs full-dump logic as document chat. Both `_build_evidence_block` and the source inventory filter to sources where `item.get("active", True)` is True; inactive sources are excluded entirely from RAG retrieval, full-dump, and the inventory. A source inventory (title + type, no content, active sources only) is always prepended to the system prompt unconditionally so the LLM can report what sources exist even when RAG only returns partial content. The two paths (attached context vs auto evidence block) are mutually exclusive. `DELETE /documents/{doc_id}/evidence-chat` clears `evidence_chat_history`; frontend "Clear chat" trash button calls this and resets local messages; also resets `sentFingerprintRef`. No "All sources" option in `SourcePickerPopup` — replaced with a muted informational note. **Stale-context warning**: `sentFingerprintRef` stores the sorted active-source ID fingerprint at send time; if the current fingerprint differs (sources toggled since last message), the trash icon turns near-black and its tooltip changes to prompt clearing. Warning clears on send (fingerprint updated) or on clear (ref reset to null).
- **Token limits**: `max_tokens=8192` in `chat.py`; `max_tokens=4096` in `actions.py`. If a `<proposed_document>` opening tag is present but no closing tag (truncated response), `chat.py` discards the partial proposal and returns a user-facing error message as a plain assistant bubble instead of triggering diff view.
- **Document export**: `GET .../export/txt` strips markdown to plain text. `GET .../export/md` returns content as-is. `GET .../export/pdf` uses `markdown` + `weasyprint`. All auth-required. Frontend Export dropdown: `.txt` · `.md` · `.pdf`.
- **Document import**: `POST /documents/import` (multipart, auth required). Accepts `.docx`, `.md`, `.txt` (400 otherwise). `.docx` converts via mammoth → html2text; falls back to raw text if html empty. Title from filename (extension stripped), truncated to 200 chars. Route must precede `/{doc_id}` routes in `documents.py`.
- **Global search**: `POST /search` — searches titles, content, evidence, chat history (not evidence_chat_history); ≤5 results per group. `SearchOverlay.jsx` triggered by Cmd/Ctrl+K or search icon. Evidence results navigate to Evidence view with `{ state: { evidenceId } }`; `Evidence.jsx` pre-selects on load via `initialSelectDoneRef` (one-shot).

## Document Tree

- Protected nodes show lock icon; unlocked nodes show it faintly on hover. Both the per-section lock/unlock icon and the structure lock toggle in the Structure panel header are hidden during diff view.
- During diff view (`pendingProposal` truthy), a `pendingProposal` boolean is threaded `Document.jsx` → `DocumentSidebar.jsx` → `DocumentTree.jsx` to suppress both lock controls; tree content remains fully visible.
- Clicking a heading scrolls to it via `useImperativeHandle` on `Editor`. In edit mode: `scrollToHeading` mirrors into the textarea. In preview mode: `scrollToHeadingPreview` queries heading elements inside `previewContainerRef` and calls `scrollIntoView`. `Document.jsx` `onHeadingClick` branches on `editorMode`.
- No `##` headings → DocumentSidebar shows placeholder. `parseHeadings` is exported from `DocumentTree.jsx`.

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

- **Attachment**: The Document page chat + button opens a section picker directly (no intermediate popup, no evidence option). The picker is inlined in `ChatPanel.jsx`: search input focuses on open, filters headings by query, closes on item select / outside click / Escape. The evidence base is auto-injected into every request's system prompt already; per-message evidence attachment is not needed here. `AttachmentPopup.jsx` is NOT used by `ChatPanel` — it is used only by `EvidenceChatPanel`, where attaching a single source is a deliberate "focus on one source" gesture distinct from the active-checkbox filtering on the Evidence page. **`document` prop shadowing**: `ChatPanel` receives a prop named `document` (the SpeedWrite document object) which shadows the browser global inside the function body. Any `addEventListener`/`removeEventListener` calls inside `ChatPanel` must use `window.document`, not `document`.
- **Context chip**: label + char count. Amber + `⚠` when truncated. Hard truncation at 10000 chars (`ATTACHMENT_TRUNCATION_LIMIT`); amber warning also at 10000 (`ATTACHMENT_WARNING_THRESHOLD`). Raw section content is passed directly to `ChatPanel` — truncation happens there.
- **Context priority**: `localContext` (popup) takes priority over `contextText` prop (editor selection). `contextText` being set clears `localContext`. Both cleared on send.
- **Add to chat / Edit→Preview**: flipping from Edit to Preview clears the pending text selection (`selectedText`) and the browser's DOM selection. After the flip, Add to chat returns to its disabled state. This is intentional — Preview selections do not enable Add to chat, so any Edit selection retained across the flip would be invisible and ambiguous.
- **Context label**: stored as `context_label` on user entries in `chat_history`; shown as a small tag above the user bubble.
- **Single Send button**: no Edit/Chat split. `_build_mode_instruction()` in `chat.py` instructs AI to return `<proposed_document>` for change requests, respond conversationally for questions.
- **Preserve instruction** (`_PRESERVE_INSTRUCTION` in `chat.py`): prepended to system prompt; instructs AI to return tables, image refs, code blocks, and blockquotes verbatim. Not used in `actions.py`.
- **Enter key**: configurable via `localStorage` key `speedwrite_submit_on_enter`. Send button uses `onClick={() => handleSend()}` (not `onClick={handleSend}`) to prevent the click event being passed as `textOverride`.
- **onActionComplete**: optional prop on both panels; called after each successful response to refresh `user` state for cap enforcement.
- **Auto-scroll (user-intent model)**: `isFollowingRef` (ref, starts `true`) tracks whether the user is following the conversation. The scroll handler sets it `true` when near the bottom (< 100px) and `false` when scrolled away. The `[messages, loading]` effect scrolls to bottom only when `isFollowingRef.current` is true — no geometry check at render time. `scrollToBottom` (including the ↓ Latest button) resets it to `true`.
- **Clear chat**: trash icon ghost button in panel header; calls `DELETE /documents/{doc_id}/chat` (or `/evidence-chat`), resets local `messages` to `[]`. No confirmation.
- **Empty assistant bubbles**: bubble not rendered when `msg.content?.trim()` is falsy — prevents visible empty bubble during response construction.

## Document History

- Snapshots: `history: list` on doc JSON; max 50 (oldest dropped). Auto-snapshot every 10 saves.
- Four triggers: `auto`, `rewrite`, `restore`, `manual`.
- `share_token` and `comments` are initialised in `add_snapshot()`; existing snapshots without them degrade safely via `.get()`.
- `GET .../history` — list newest-first; no `content` or `share_token` in list response.
- Restore flow: History.jsx navigates to Document with `{ state: { restoreContent, restoreSnapshotId, restoreSnapshotLabel } }`; Document.jsx reads on load, sets `pendingProposal` + `pendingProposalReason: 'restore'`, clears location state via `window.history.replaceState`. Accept → `trigger='restore'` snapshot created; Reject → unchanged.
- `pendingProposalReason`: `'ai_rewrite'` (default) or `'restore'`. Controls snapshot trigger in `handleAccept`. Reset to `'ai_rewrite'` after accept.

## Version Sharing

Sharing is tied to History snapshots (immutable), not to the live document. Anyone with a share link can view the snapshot and leave a comment (name + body). The document owner can delete comments.

- **Backend**: `backend/sharing.py` — registered last in `main.py` (no prefix).
- **Share/unshare**: `POST .../share` (idempotent — returns existing token if already set). `POST .../unshare` sets `share_token = None`.
- **Public read**: `GET /shared/{token}` — no auth. Scans all users' documents via `load_users()` + `list_documents()`.
- **Comments**: public `POST /shared/{token}/comments` (no auth, `is_owner: False`); owner `POST .../comments` (auth required; name from `display_name || email`, `is_owner: True`); `DELETE .../comments/{comment_id}` requires auth.
- **`is_owner` field**: new comments always set it; old entries degrade safely via `.get()`. Owner comments get distinct styling + "Owner" badge in both History.jsx and SharedView.jsx.
- **Share URL**: `window.location.origin + '/shared/' + token` — never hardcoded to a domain.
- **History.jsx COMMENTS panel**: label-only header. `comment_count` in snapshot list state updated optimistically on add/delete.

## Feedback

- **Trigger**: `onFeedbackClick` prop on `TopBar`. All pages pass `() => setShowFeedback(true)`.
- **UI**: `FeedbackBar.jsx` — slim bar rendered below TopBar. Single text input (maxLength 2000), Send button, × close. Escape also closes. Auto-closes 2s after successful send.
- **Backend**: `POST /feedback` in `backend/feedback.py`, auth required. Sends email via `mailer.send_email()` to `FEEDBACK_EMAIL` (env var, defaults to `EMAIL_FROM`). Always returns `{"ok": true}` — email failures are logged but not surfaced to the user.
- **`mailer.py`** named to avoid shadowing Python's stdlib `email` module — applies to all of `mailer.py`, not just feedback.

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

- **Password reset**: TTL 1 hour; always returns 200 (does not reveal whether email exists). SendGrid errors logged, not surfaced.
- **Change password / email / profile / delete account**: standard auth endpoints in `auth.py`. Delete uses `shutil.rmtree` on docs and embeddings dirs.
- **Email sending**: named `mailer.py` (not `email.py`) to avoid shadowing Python's stdlib `email` module.
- **User record**: all optional fields use `.get()` for safe degradation. `is_admin` is set manually in `users.json` — no UI.
- **BYOK**: `GET /auth/me` returns `has_byok_key` and `byok_key_masked`. `get_byok_key(user)` returns decrypted key or `None` — raises HTTP 500 if stored but decryption fails.

## Welcome Document

When a new user registers, if `/var/speedwrite/welcome_document.md` exists, a copy is created as their first document. Title derived from the first H1 heading; falls back to "Getting Started". Silent skip if no template exists — registration never errors because of it.

- **`auth.py` registration**: builds a document dict inline after `save_users()`, then calls `save_document()`. Wrapped in bare `except` so template errors never surface to the registering user. No import from `documents.py` — avoids circular import.
- **`POST /documents/save-as-welcome`** (admin only): loads admin's document and writes to `WELCOME_TEMPLATE_PATH`. Must be defined before `/{doc_id}` routes in `documents.py`.
- **Frontend**: "Save as welcome" in Document ContextBar `rightControls`, visible only when `user?.is_admin`, hidden during diff view.

No admin UI for viewing or editing the template directly — set it by opening any document and clicking Save as welcome.

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
- **Stale counter cleanup**: `cleanup.py` zeroes `ai_actions_used` for any user whose `ai_actions_reset_at` is from a prior month.

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
