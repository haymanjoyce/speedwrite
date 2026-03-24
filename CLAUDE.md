# SpeedWrite — Claude Code Context

## Project Overview

SpeedWrite is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI agent chat, and markdown content.

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

The app uses three tiers of navigation and controls:

**Tier 1 — Global bar (TopBar)**
- Always visible at the top of every page
- Contains: app name/logo, breadcrumb navigation, search icon, user email, logout
- Breadcrumb shows "SpeedWrite" (links to /) and, when a document is open, a spacer gap then the document title (plain text or editable input when renaming). No sub-page labels (Evidence, Log) in the breadcrumb — those are shown as tabs in the context bar instead. Props: `user`, `onLogout`, `docTitle`, `isRenaming`, `onRenameSave`, `onRenameCancel`.

**Tier 2 — Page context bar (ContextBar)**
- Sits below the global bar
- Left side: tab navigation (Document / Evidence / Log) for document sub-views; active tab is `text-gray-900 font-semibold`, inactive tabs are `text-gray-400 hover:text-gray-700 transition-colors`. No status text in the context bar — save status lives in the Editor panel header, source count lives in the AI Chat panel header.
- Right side: page-specific action buttons (outlined, `text-xs rounded px-3 py-1 border border-gray-200 hover:bg-gray-50 hover:border-gray-300`)
- Layout per view:
  - Library (doc selected): no tabs · right: Open (primary) · Rename · Delete
  - Document: tabs (Document active) · right: Add to chat (conditional) · Rename · Save as template · Close; tabs hidden and replaced with Accept · Reject when a proposal is pending
  - Evidence: tabs (Evidence active) · right: Reindex (conditional, hidden when no sources) · Sync now (conditional) · Delete (conditional) · Close
  - Log: tabs (Log active) · right: Close
- ContextBar accepts a `tabs` prop: `[{ label, active, onClick }]`

**Tier 3 — Panel headers**
- Each panel has a slim header (h-11, bg-white, border-b border-gray-200)
- Label: text-xs font-semibold text-gray-500 uppercase tracking-wide (left-aligned)
- Panel-specific actions sit in the panel header or below it
- Current panel headers:
  - Structure (document tree, no actions)
  - Editor (save status `text-xs text-gray-400` + Edit/Preview segmented control right-aligned in header; save status managed as local state inside `Editor.jsx`)
  - AI Chat (source count `text-xs text-gray-400` beside label left-aligned when `evidenceCount > 0`; Redraft and Insights dropdowns right-aligned in header)
  - Sources (full-width Add button + Reindex below header)
  - Source Detail (no actions)
  - Documents (full-width New Document button below header)
  - Document Detail (no actions)
  - Log (no actions)
  - Entry Detail (no actions)

### Control type rules

**Outlined buttons** (rounded, in ContextBar tier 2):
- Navigation actions: move to another page or close current view
- Page-level actions: Rename, Delete, Open
- Toggle states: Accept/Reject during diff review, Add to chat
- Default: `text-xs rounded px-3 py-1 border border-gray-200 hover:bg-gray-50 hover:border-gray-300`
- Primary variant: `text-white bg-blue-600 border border-blue-600 hover:bg-blue-700`
- Danger variant: `text-red-600 border border-red-200 hover:bg-red-50`

**Buttons** (rounded, in panel headers or below them):
- Panel-specific CRUD actions: Add Source, New Document
- Full-width when they are the primary action for a panel
- Use Button.jsx component with variant='primary' or 'secondary'

**Segmented controls** (SegmentedControl.jsx):
- Mutually exclusive mode switches within a panel
- Examples: Edit/Preview in Editor panel
- Always in panel header, right-aligned

**Dropdowns** (ActionsDropdown.jsx):
- Grouped sets of AI or transform actions
- Examples: Redraft, Insights in AI Chat panel header
- Always in panel header, right-aligned
- Open downward with right-alignment to avoid off-screen overflow

### General principles
- Labels and primary actions never compete for attention — label left, actions right
- Destructive actions (Delete) always styled as danger/red
- Primary actions (Add, New) always blue
- The further down the tier hierarchy, the more specific the action scope — global bar affects everything, panel header affects only that panel

### No-modal rule and intentional exception
The app avoids modals as a general rule — actions happen inline or in panels. The **one intentional exception** is the global search overlay (`SearchOverlay.jsx`). Search is a transient, context-preserving interaction: the user needs to find something without losing their current place, and a full-screen dimmed overlay communicates "temporary mode" clearly. Do not add further modals without a similarly strong justification.

### Delete confirmations
Destructive delete actions use an inline confirmation bar below the context bar instead of `window.confirm()`. The bar has a red (`bg-red-50 border-red-100`) background, a plain-text warning message on the left, and red Delete + gray Cancel buttons on the right. Escape or Cancel dismisses without deleting. Applies to: document delete (Home.jsx) and evidence source delete (Evidence.jsx). `pendingDelete` boolean state controls bar visibility; it is cleared on selection change and on successful deletion.

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
│   ├── search.py        # POST /search — cross-document full-text search
│   ├── templates.py     # CRUD + AI prefill for document templates
│   ├── log.py
│   ├── models.py
│   └── storage.py
├── frontend/                         # React 18 + Vite + Tailwind CSS
│   └── src/
│       ├── context/
│       │   └── SearchContext.jsx         # SearchProvider + useSearch() hook — global search overlay state
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Document.jsx
│       │   ├── Evidence.jsx
│       │   ├── Log.jsx
│       │   ├── History.jsx
│       │   ├── Login.jsx
│       │   └── Register.jsx
│       ├── components/
│       │   ├── TopBar.jsx            # Global nav: breadcrumb + user/logout
│       │   ├── ContextBar.jsx        # Secondary nav: context-specific action buttons
│       │   ├── Sidebar.jsx           # Unused — kept in repo
│       │   ├── Button.jsx            # Reusable button (variant: primary/secondary/danger/ghost; size: sm/md)
│       │   ├── DocumentSidebar.jsx
│       │   ├── DocumentTree.jsx
│       │   ├── Editor.jsx
│       │   ├── DiffView.jsx          # LCS-based inline diff renderer (replaces editor when proposal pending)
│       │   ├── MarkdownPreview.jsx   # Custom markdown renderer for Preview mode (no external deps)
│       │   ├── ChatPanel.jsx
│       │   ├── AttachmentPopup.jsx   # Two-screen popup for attaching sections or evidence to chat
│       │   ├── ActionsDropdown.jsx   # Reusable dropdown pill — accepts title + actions[] props; menu opens right-aligned (right-0)
│       │   ├── InstructionBar.jsx    # Slim bar below context bar for optional action instructions
│       │   ├── ProviderToggle.jsx    # Segmented pill to switch between Anthropic and Ollama
│       │   ├── SegmentedControl.jsx  # Reusable segmented pill control (options, value, onChange)
│       │   ├── ErrorBoundary.jsx     # Class component error boundary; catches render crashes
│       │   ├── SearchOverlay.jsx     # Global search overlay — grouped results, keyboard nav, inline highlighting
│       │   ├── TemplatePickerOverlay.jsx  # Two-screen overlay: template grid picker → AI pre-fill step
│       │   ├── EvidenceChatPanel.jsx # Three-panel evidence chat — source picker, Insights dropdown, stop button
│       │   ├── EvidenceSidebar.jsx
│       │   ├── SourceDetail.jsx
│       │   └── AddSourceModal.jsx
│       ├── constants/
│       │   └── attachmentLimits.js       # ATTACHMENT_TRUNCATION_LIMIT and ATTACHMENT_WARNING_THRESHOLD (both 6000)
│       ├── insightPrompts.js             # Shared SHARED_INSIGHT_ACTIONS array (Summarise · Find contradictions · Extract themes)
│       ├── data/
│       │   └── templates.js              # BUILT_IN_TEMPLATES constant (5 built-in templates)
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

1. **Library view** (`/`) — document list on the left sidebar, document detail on the right. Context bar shows Open, Rename, and Delete action buttons when a document is selected.
2. **Document view** (`/document/:id`) — document tree on the left, markdown editor in the middle, AI agent chat panel always visible on the right. Context bar shows tabs (Document active) + Save version · Rename · Save as template · Close buttons; "Add to chat" appears when editor text is selected. **Redraft** and **Insights** dropdowns live in the ChatPanel header (not the context bar). Edit/Preview segmented control lives in the Editor panel header (right-aligned). When the AI proposes a change, the editor is replaced by an inline diff view and the context bar shows only Accept and Reject buttons.
3. **Evidence view** (`/document/:id/evidence`) — three-panel layout: source list (260px) on the left, source detail (flex-1) in the middle, `EvidenceChatPanel` (380px) always visible on the right. Context bar shows tabs (Evidence active) + Reindex (hidden when no sources) · Sync now (conditional) · Delete (conditional) · Close buttons.
4. **Log view** (`/document/:id/log`) — audit log entries newest-first on the left, entry detail on the right. Context bar shows tabs (Log active) + Close button.
5. **History view** (`/document/:id/history`) — version snapshot list on the left, snapshot detail + MarkdownPreview on the right. Context bar shows tabs (History active) + Close button.

### Error Boundaries

`ErrorBoundary.jsx` is a class component that catches unhandled React render errors. It shows a centered friendly error screen (SpeedWrite name, heading, message, "Refresh page" button, collapsible error details). Two levels are used in `App.jsx`: one outer boundary wrapping `<BrowserRouter>` to catch router-level crashes, and one per-route boundary around each page component so a crash in one page doesn't affect navigation to others.

### Navigation

Every view has a two-tier navigation:
- **TopBar** — global: logo/breadcrumb, search icon, user email, logout. The breadcrumb shows "SpeedWrite" (links to /) and the document title when present — no sub-page labels. Container has `min-w-0 overflow-hidden whitespace-nowrap`; full path shown as native `title` tooltip on hover. In Document view, clicking Rename activates inline editing: the title span is replaced by an `<input>` (border-b border-blue-400, auto-sized via `size` attribute); Enter/blur saves, Escape cancels. `TopBar` accepts `isRenaming`, `onRenameSave`, `onRenameCancel` props. In Library view, the Document Detail panel title uses the same pattern with ✓/✕ confirm buttons. Sub-page navigation (Evidence, Log) is handled by tabs in the ContextBar, not the TopBar breadcrumb.
- **ContextBar** — context-specific: outlined action buttons right-aligned, tab navigation left-aligned. Default buttons are `border border-gray-200 rounded`. Actions can set `variant: 'primary'` for a blue button (`bg-blue-600 border border-blue-600 text-white`). Primary sidebar actions (New Document, Add Source) are blue buttons inside sidebar headers. "Open" in the library view and "Add to chat" in the document view use `variant: 'primary'`.

## AI Features

- **Agent panel**: Always-on agent mode — the AI can propose document changes in response to any message. When the AI returns a `<proposed_document>` block, the editor is replaced by an inline diff view (via `DiffView.jsx`). The context bar switches to Accept/Reject buttons with "Reviewing changes…" status. Accepting applies the change to the editor and triggers auto-save; rejecting discards it and appends "Changes rejected." to the chat. While in diff view, the AI chat panel is hidden (wrapped in `<div className={pendingProposal ? 'hidden' : 'contents'}>` — `display: contents` keeps ChatPanel as a direct flex item when visible; `display: none` hides it while keeping it mounted so the ref and chat state are preserved for the reject path).
- **Inline diff view**: LCS-based line diff rendered in `DiffView.jsx`. Removed lines shown in red with strikethrough; added lines in green. Equal lines shown in muted gray (`text-gray-500`) to visually de-emphasise unchanged content. Blank lines rendered with `min-h-[1rem]`. A subtle `border-t border-gray-100` separator appears when returning from a changed block to unchanged text. All lines have `py-0.5` spacing. Gutter symbols (`+`/`-`/space) are `w-4 font-mono text-xs`. On mount, `DiffView` auto-scrolls to the first changed line (`scrollIntoView({ behavior: 'smooth', block: 'center' })`). The diff occupies the same flex slot as the editor.
- **Edit/Preview toggle**: Segmented control in the Editor panel header (right-aligned) switches between the raw markdown textarea (`edit`) and `MarkdownPreview.jsx` (`preview`). Hidden when a diff is pending; DiffView always shows in that case regardless of mode. `Editor.jsx` accepts `editorMode` and `onEditorModeChange` props.
- **Markdown preview**: `MarkdownPreview.jsx` is a custom renderer (no external deps) supporting h1–h3, bold, italic, inline code, fenced code blocks, unordered lists, paragraphs, and URLs.
- **Rewrite button**: Each document tree node shows a "Rewrite" button on hover. Clicking it calls `chatPanelRef.current.prefillRewrite(sectionContent, headingText)` in `Document.jsx`, which pre-fills the chat input with "Rewrite this section.", sets the section as `localContext` (with the heading as label), and focuses the textarea. The user can edit the instruction before sending. The send flow then handles the API call, stop button, context label, and diff view exactly as a normal message with context.
- **Context scoping**: When context is attached (selected editor text, a section from the attachment popup, or an evidence source), the AI is instructed to change only that section and return the complete document with only that part replaced. When no context is attached, the AI can propose changes to the whole document. `ignore_history: bool` on `ChatRequest` is set to `true` whenever context is attached (ensuring a fresh response uninfluenced by prior conversation).
- **Evidence base**: Supports file uploads (`.pdf`, `.txt`, `.md`, `.docx`), URL, plain text, and other documents as sources. All evidence is injected into AI context automatically. Document-type sources have a sync toggle: sync=on fetches live content from the source document at chat time; sync=off uses a stored snapshot. "Sync now" (context bar) manually refreshes the snapshot (only available when sync=off).
- **Embeddings and RAG**: Evidence sources are chunked (2000 chars, 200 overlap) and embedded via Ollama (`nomic-embed-text`) in background threads. Embeddings stored at `{DATA_DIR}/embeddings/{user_id}/{doc_id}.json`. At chat/action time, if total non-live evidence content exceeds 8000 characters and embeddings exist, top-5 semantically relevant chunks are retrieved (cosine similarity, no threshold) instead of the full dump. Live sync-on document sources are always included directly. If Ollama is unavailable, falls back to full truncated dump silently. `POST /documents/{doc_id}/evidence/reindex` triggers a fire-and-forget reindex of all eligible sources. Implemented in `backend/embeddings.py` (pure Python, no numpy). Per-document threading locks prevent race conditions during concurrent indexing. `OLLAMA_HOST` env var configures the Ollama endpoint.
- **Document actions**: Whole-document AI actions in two dropdowns inside the **ChatPanel header** (not the context bar). **Redraft** actions (Rewrite, Restructure, Expand, Condense, Simplify, Formalise) show a compact inline instruction bar below the header for optional instructions, then fire via `fireInsightInternal(prompt)`. **Insights** actions (Summarise · Find contradictions · Extract themes) fire immediately. Both are self-contained inside `ChatPanel.jsx` — `REDRAFT_PROMPTS`, `INSIGHTS_PROMPTS`, `REDRAFT_LABELS`, `handleActionSelect`, and `runAction` all live in `ChatPanel.jsx`. `INSIGHTS_PROMPTS` is built from `SHARED_INSIGHT_ACTIONS` (imported from `insightPrompts.js`). Both dropdowns are disabled when `pendingProposal` is truthy. `Home.jsx` description generation still calls `api.documentAction` directly. Both `ChatPanel` and `EvidenceChatPanel` share identical header styling (`h-9 bg-white border-b border-gray-200`, label `text-xs font-semibold text-gray-500 uppercase tracking-wide`, "AI Chat").
- **Content override safety**: `editorContentOverride` in `Document.jsx` is a one-shot signal. After `Editor.jsx` applies it, `onContentOverrideApplied` fires immediately to clear it back to `null`, preventing re-application on subsequent renders.
- **LLM abstraction layer**: All LLM calls are routed through `backend/llm.py` (`complete()` → `_complete_anthropic` or `_complete_ollama`). The active provider is controlled by the `LLM_PROVIDER` env var (default: `anthropic`). Ollama is fully supported as an alternative provider. `_complete_ollama` uses `httpx.Timeout(connect=10.0, read=300.0, write=30.0, pool=10.0)` and raises `HTTPException` on `ConnectError` (503), `ReadTimeout` (504), and other errors (500) with descriptive messages. The `provider` field in chat/action request bodies can override the env var per-request.
- **Provider toggle UI**: `ProviderToggle.jsx` exists and uses `SegmentedControl` to switch between Anthropic and Ollama. It is not currently exposed in the Document view — reserved for a future enterprise/self-hosted tier. The underlying backend and `api.js` plumbing remains intact.
- **Backend model**: Anthropic path uses `claude-sonnet-4-20250514`. Ollama path uses `OLLAMA_CHAT_MODEL` env var (default: `llama3.2`). Anthropic API key stored in `.env` as `ANTHROPIC_API_KEY`.
- **Evidence chat**: `EvidenceChatPanel.jsx` is a persistent chat panel on the Evidence page for interrogating individual sources. The `+` button opens a `SourcePickerPopup` (evidence sources only — no section option); the first item is "📚 All sources" which fetches all sources in parallel, concatenates them with `--- Source: {title} ({type}) ---` separators, and sets label to "All sources (N sources)"; individual sources call `api.getEvidence(docId, evidenceId)` to fetch full content. All attached content is truncated to 6000 chars (amber chip shown if original exceeded 3000 chars). An **Insights** dropdown in the panel header (Summarise · Find contradictions · Extract themes, shared with ChatPanel via `insightPrompts.js`) is disabled when no source is attached; clicking an item fires the prompt automatically. History is stored as `evidence_chat_history` on the document JSON and loaded/reset on `document.id` change. `ignore_history` is set to `true` when context is attached (fresh response per source). Backend endpoint: `POST /documents/{doc_id}/evidence-chat` in `backend/evidence_chat.py`. Never modifies the document — returns `{ message }` only.
- **Token limits**: `chat.py` and `actions.py` both use `max_tokens=4096` to prevent truncated `<proposed_document>` responses. Known limitation: very large attachments (sections or evidence sources) can still cause truncation if the combined prompt + response exceeds the model's context window. Workaround: attach smaller sections rather than entire large documents. Future fix: streaming responses or context summarisation.
- **Document templates**: Users can create documents from built-in templates or their own saved templates. Built-in templates (Meeting Notes, Research Report, Project Brief, Weekly Update, Decision Log) are defined as `BUILT_IN_TEMPLATES` in `frontend/src/data/templates.js`. User templates are stored at `/var/speedwrite/templates/{user_id}/{template_id}.json` and managed via `backend/templates.py` (GET /templates, GET /templates/{id}, POST /templates, DELETE /templates/{id}). The Library view Documents panel has two stacked full-width buttons: `+ New Document` (primary, existing behaviour) and `From template…` (secondary) which opens `TemplatePickerOverlay.jsx`. The overlay has two screens: (1) template grid (two tabs: Built-in / My Templates, 2-column card grid; My Templates cards have an instant-delete × button); (2) AI pre-fill step — template name in header, optional description textarea, "Create without AI" and "Create with AI" buttons. Built-in template content comes from the frontend constant; user template content is fetched via `GET /templates/{id}` on card select. "Create with AI" is disabled when description is empty; both buttons show "Creating…" and are disabled while the request is in flight. `POST /templates/prefill` calls `llm.complete()` (respects `LLM_PROVIDER`, max_tokens=2048) and returns `{ content }`. Both creation paths navigate to `/document/:id` on success. Document view context bar order: Rename · Save as template · Evidence · Log · Close. "Save as template" opens an inline bar below the context bar (same slot as `activeBar` state: `null | 'save-template'`), with title input (pre-filled from doc title), description input, Save/Cancel buttons; on save shows "Template saved" status for 3 seconds.
- **Global search**: `POST /search` (`backend/search.py`) performs case-insensitive substring search across all of the user's documents — document titles and content, evidence source titles and content, and `chat_history` messages (not `evidence_chat_history`). Returns up to 5 results per group (documents, evidence, chat). Excerpt helper extracts ~200 chars around the first match, padded with `…`. Frontend: `SearchOverlay.jsx` is an overlay (fixed inset-0 z-50, bg-black bg-opacity-40) with a centered panel (max-w-2xl mt-24). Triggered by Cmd/Ctrl+K or the search icon in TopBar. State managed via `SearchContext.jsx` (`SearchProvider` + `useSearch()` hook); `AppRoutes` in `App.jsx` registers the keyboard listener and renders the overlay. Search-as-you-type with 300ms debounce. Idle state ("Start typing…") shown when query < 2 chars; "Searching…" while loading; "No results found" on empty results. Match terms highlighted inline in the frontend (split on match, wrap in `<strong>`). Evidence results navigate to `/document/:id/evidence` with `{ state: { evidenceId } }`; `Evidence.jsx` reads `location.state.evidenceId` on items-load to pre-select the source (one-shot via `initialSelectDoneRef`). **Known performance limitation**: search does full in-memory substring scan across all documents, evidence content, and chat history on every debounced keystroke — fine for typical dataset sizes but will slow down with very large evidence corpora. Future fix: index-based search or SQLite FTS.

## Document Tree

- Hovering a tree node highlights that node and all its child nodes (bg-blue-50).
- One button appears on hover: **Rewrite** — pre-fills the chat input with the section as context and "Rewrite this section." as the message, then focuses the textarea so the user can edit before sending. Hidden for protected headings. The former "Add" button was removed — section attachment is now handled via the + button in the chat input (see Chat Panel).
- Protected headings shown with `bg-gray-100` background and a lock icon (🔒). Lock icon for unlocked headings shown faintly on hover only.
- Clicking the heading text scrolls the editor to that heading (via `useImperativeHandle` on Editor).
- When the document has no `##` headings, `DocumentSidebar.jsx` shows a placeholder: "No structure yet. Add ## headings to build a document tree." `parseHeadings` is exported from `DocumentTree.jsx` for use by the sidebar.
- `SegmentedControl.jsx` is used for the Edit/Preview toggle in `Editor.jsx` (panel header) and internally by `ProviderToggle.jsx`. Styling: `text-xs rounded px-3 py-1`; active segment is `bg-blue-600 text-white hover:bg-blue-700`; inactive is `bg-white text-gray-600 hover:bg-gray-50`; container has `border border-gray-200 rounded overflow-hidden`.

## Chat Panel

- Single agent mode — no chat/agent toggle.
- **Attachment system**: A **+** button beside the textarea opens `AttachmentPopup.jsx` — a two-screen popup (type selector → section or evidence picker). Section picker lists document headings (H1–H3) parsed via `parseHeadingsWithContent` in `Document.jsx`; evidence picker lists all sources from `doc.evidence`. Selecting an item sets it as context (`localContext` state in `ChatPanel`) and closes the popup. The popup closes on outside click (anchor-ref-aware, so clicking + toggles cleanly) or Escape.
- **Context chip**: shows the attachment label (e.g. `📄 Introduction`) or `Selected text (N chars)` for editor selections. Displays character count as `{originalLength} / 6000 chars`. If the original content was truncated (exceeded 6000 chars), the chip switches to amber styling (`bg-amber-50 border-amber-200`) and shows `⚠ {N} / 6000 chars (truncated)` with a tooltip. Dismissed with ×. No emoji prefix — the chip styling makes the attachment nature clear.
- **Attachment limits**: truncation limit (6000 chars) and amber warning threshold (6000 chars) are defined as `ATTACHMENT_TRUNCATION_LIMIT` and `ATTACHMENT_WARNING_THRESHOLD` in `frontend/src/constants/attachmentLimits.js` and imported by `ChatPanel.jsx` and `EvidenceChatPanel.jsx`. Amber warning fires only when content is actually truncated (both constants equal 6000).
- **Context truncation**: `truncateContext()` in `ChatPanel.jsx` truncates content to the last complete line before 6000 chars and appends `\n[truncated]`. Amber warning fires at 3000 chars original length (as a signal of a large attachment), but hard truncation is at 6000 chars. Truncation happens in `handleAttach` (for popup attachments) and at send time (for `contextText` prop). `originalLength` is stored pre-truncation so the chip always shows the original size. `AttachmentPopup` passes raw untruncated content — all truncation is handled in `ChatPanel`.
- **Per-source RAG**: When an evidence source is attached (popup-selected individual source, not "All sources" or a section), `ChatPanel` and `EvidenceChatPanel` run a RAG preflight before sending: `api.ragQuery(docId, evidenceId, userMessage, signal)` → `POST /documents/{doc_id}/evidence/{evidence_id}/rag-query`. If `used_rag: true` and chunks are returned, the chunks (joined `\n---\n`) replace `contextSnapshot.text` for that send. On success, `ragActive` state is set `true` and a `✦ RAG` badge appears near the Stop button for the duration of the request. `ragActive` is cleared in the `finally` block and by the Stop handler. Failures (including abort) fall back silently to the full context. Backend: `retrieve_relevant_chunks` in `embeddings.py` accepts an optional `evidence_id` param to filter chunks before ranking.
- **Context priority**: `localContext` (popup attachment) takes priority over `contextText` prop (editor selection / "Add to chat"). When `contextText` is set externally, `localContext` is cleared. On send, both are cleared.
- **Context label**: When a message is sent with context attached, a `context_label` string is stored alongside it — `localContext.label` (e.g. `📄 Introduction`) for popup attachments, `'Selected text'` for editor selections. The label is stored in `chat_history` on the backend (`context_label` field on user entries) and loaded back on mount. User messages with a `context_label` display a small label tag above the message bubble, right-aligned (no emoji prefix). `DocumentTree` passes `(content, h.text)` to `onSectionRewrite`; `Document.jsx` forwards `h.text` as `context_label` to the API.
- **Assistant message rendering**: assistant messages are rendered via `MarkdownPreview` (wrapped to strip `p-8`, `max-w-3xl`, `overflow-y-auto`, `bg-white`, `flex-1` from its container). User messages remain plain `whitespace-pre-wrap` text.
- Chat history is loaded (and reset) whenever `document?.id` changes. This fires once per document, so mid-conversation saves (which update the document prop without changing its ID) do not overwrite in-flight messages. On load, a `setTimeout(..., 0)` scrolls to the bottom after the DOM updates.
- **Note on double fetches in development**: `React.StrictMode` is enabled in `main.jsx`. In React 18 development mode, this intentionally mounts → unmounts → remounts every component, causing each effect to fire twice. Two `GET /documents/:id` requests on page load is expected behaviour in dev and does not happen in production builds.
- When the AI returns `<proposed_document>` tags, the extracted content is passed to `Document.jsx` via `onProposedChange`. The chat panel only ever shows the explanation text — proposed content is never rendered inside the chat.
- `ChatPanel` is a `forwardRef` component. It exposes `appendMessages(userMsg, assistantMsg)` via `useImperativeHandle` so `Document.jsx` can inject messages (e.g. after a Rewrite or Reject). If `userMsg` is `null`, only the assistant message is appended.
- **Stop button**: While a chat request is in flight, the Send button is replaced by a red "■ Stop" button. Clicking it calls `AbortController.abort()`, which cancels the fetch. `AbortError` is caught silently (no error message). The `AbortController` is stored in `abortControllerRef` and cleared in the `finally` block. `api.js`'s `request()` accepts an optional `signal` param forwarded to `fetch()`.
- Enter key behaviour is user-configurable: "↵ on" sends on Enter (Shift+Enter for newline); "↵ off" reverts to Ctrl/Cmd+Enter only. Preference persisted in `localStorage` as `logbooklm_submit_on_enter` (key kept as-is for backwards compatibility with existing user preferences).
- A "↓ Latest" button appears between the messages area and the input when the user has scrolled more than 100px from the bottom. Auto-scroll only fires when already near the bottom.

## Audit Log

- Append-only log stored as `audit_log` array on each document JSON.
- `append_audit_log(doc, event, detail)` helper in `storage.py` creates a UUID entry and appends it.
- Events: `document_created`, `document_edited`, `rewrite_accepted`, `rewrite_rejected`, `evidence_added`, `evidence_deleted`. Note: `document_deleted` was removed — writing a log entry to a file that is immediately deleted served no purpose.
- **Document deletion cleanup**: `DELETE /documents/{doc_id}` removes the evidence directory (`DOCS_DIR/{user_id}/evidence/{doc_id}/`, via `shutil.rmtree`), the embeddings file (`embeddings/{user_id}/{doc_id}.json`), and the document JSON. All three are cleaned up atomically in the endpoint; `storage.delete_document()` only removes the document JSON.
- `GET /documents/{doc_id}/log` returns entries newest-first. `POST /documents/{doc_id}/log` appends a manual entry.
- Log view (`/document/:id/log`) in `Log.jsx` — left panel lists entries, right panel shows selected entry detail.

## Document History

- Version snapshots stored as `history: list` on each document JSON; max 50 entries (oldest dropped when limit exceeded).
- `save_count: int` on each document tracks auto-saves and is incremented on every PUT — a snapshot is taken when `save_count % 10 == 0`.
- `add_snapshot(doc, trigger, label)` helper in `documents.py` appends a `{ id, timestamp, trigger, label, content }` entry.
- Four snapshot triggers: **auto** (every 10 saves, label "Auto save"), **rewrite** (after accepting AI rewrite, label "AI rewrite"), **restore** (after accepting a version restore, label "Version restored"), **manual** (user clicks "Save version" in context bar, label "Manual checkpoint").
- `POST /documents/{doc_id}/snapshot` — body `{ label: string, trigger: string }`. Empty/missing label defaults to "Manual checkpoint"; empty/missing trigger defaults to "manual". Trigger is passed explicitly by the frontend — no server-side string inference. Returns new entry.
- `GET /documents/{doc_id}/history` — returns list newest-first, **without** `content` field for performance.
- `GET /documents/{doc_id}/history/{snapshot_id}` — returns full snapshot including content.
- Frontend: `History.jsx` at `/document/:id/history`. Left panel lists snapshots with trigger icons (💾 auto / 🤖 rewrite / 📌 manual / 🔄 restore) and `timeAgo()` relative timestamps. Right panel shows metadata + MarkdownPreview + "Restore this version" button.
- **Restore flow**: clicking "Restore this version" navigates to `/document/:id` with `{ state: { restoreContent } }`. `Document.jsx` reads this on doc load, sets it as `pendingProposal` (triggers diff view) and sets `pendingProposalReason` to `'restore'`, then clears location state via `window.history.replaceState`. Accept → document restored; Reject → current content unchanged.
- **`pendingProposalReason` state**: `'ai_rewrite'` (default) or `'restore'`. Controls what `handleAccept` does: restore path logs `version_restored` and creates a `trigger='restore'` snapshot; AI rewrite path logs `rewrite_accepted` and creates a `trigger='rewrite'` snapshot. Reset to `'ai_rewrite'` after accept.
- **After accepting a rewrite**: `Document.jsx` fires `api.createSnapshot(id, 'AI rewrite', 'rewrite')` fire-and-forget in `handleAccept`.
- **`flashStatus` prop on `Editor.jsx`**: passed from `Document.jsx` to show brief messages ("Version saved", "Template saved") in the Editor panel header, overriding save status for 3 seconds.
- `api.js` methods: `listHistory(docId)`, `getSnapshot(docId, snapshotId)`, `createSnapshot(docId, label = '', trigger = 'manual')`.
- Context bar tabs updated in all four document sub-views (Document / Evidence / Log / History) to include the History tab.

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
| `/var/speedwrite/documents/{user_id}/{doc_id}.json` | Document data including content, evidence, chat history, audit log, protected sections, version history, and save_count |
| `/var/speedwrite/documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |
| `/var/speedwrite/embeddings/{user_id}/{doc_id}.json` | Chunked embeddings for all evidence sources in a document |
| `/var/speedwrite/templates/{user_id}/{template_id}.json` | User-saved document templates |

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
