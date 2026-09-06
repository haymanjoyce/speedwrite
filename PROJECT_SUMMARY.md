# SpeedWrite — Project Summary
Last updated: July 2026

## Overview
SpeedWrite is an AI-assisted document authoring platform, built as a personal tool. Codebase public on GitHub; runs locally via Docker Compose. Formerly deployed at speedwrite.app — see Status.
GitHub: haymanjoyce/speedwrite
Stack: React + Vite + Tailwind (frontend), FastAPI (backend), Nginx, Docker Compose

## Status
**Project sunset (September 2026).** SpeedWrite is retired — no further development planned. Decision followed two real-world tests: a report-writing task was done using Claude/Cowork instead, and a personal-archive-synthesis task was done using NotebookLM with prepared journal exports instead. Both times an existing tool served the job better than SpeedWrite could, and no gap remained that justified a pivot (an archive-analysis fork was considered and dropped for this reason). Sunset actions: make the GitHub repo public (already public) and archive it, and revoke the associated Anthropic API key. Local dev history below (VPS teardown, Cloudflare tunnel/DNS teardown, SendGrid) retained for reference only.

Background on the wind-down: Richard stopped using the tool during the wind-down period; of eight lifetime signups, zero produced any AI actions. Registration was closed in production ahead of shutdown, and a self-export notice went to six external users on 7 June 2026 with a 14 June cutoff.

Backlog below is retained for reference only — project sunset, no further work planned.

## Product Scope
SpeedWrite is a focused document authoring tool — the journey from blank page to polished document, AI-assisted. It is deliberately simple: users familiar with word processors should feel at home. It is a desktop/laptop tool — minimum width 1024px enforced in index.css.

## UI Architecture
- Tier 1: TopBar — ← back arrow (document pages, Account, Admin) or SpeedWrite logo (Landing, Library, Login, Register), document title, search icon, user/logout. No model/usage indicator.
- Tier 2: ContextBar — tabs left, actions right. `rightControls` prop renders JSX inside the actions flex row. No Close button — back arrow in TopBar serves that purpose.
  - Library: Import · Describe · Rename · Duplicate · Delete · Open · New Document. All always visible; Describe/Rename/Duplicate/Delete/Open disabled when nothing selected. Open primary when selected, New Document primary when nothing selected — one primary at a time, order fixed. Delete has confirmation bar. All secondary style including Delete.
  - Document: tabs (Document · Evidence · History · Images) · Edit/Preview toggle (rightControls) · Save version · Save as welcome (admin only) · Export ▾ · Accept/Reject (when proposal pending). "Add to chat" retired — the section picker (`+` in chat panel) is the only scope declaration mechanism.
  - Evidence: tabs + Describe · Update source · Update all sources · Reindex · Delete · Add source (primary, rightmost). Add source always enabled. Describe disabled when nothing selected. Update source disabled unless a URL or document source is selected. Update all sources disabled when no URL or document sources exist. Reindex disabled when no items. Delete disabled when nothing selected. Describe · Update source · Update all sources · Reindex all use the "Updating…"/"Updated ✓" (or equivalent) three-state pattern — disabled through both the in-progress and success phases, 3s revert.
  - History: tabs · Share this version / Revoke (secondary, disabled when nothing selected) · Copy link (secondary, disabled when nothing selected or not shared; shows 'Copied ✓' for 3s on click) · Restore this version (primary, disabled when nothing selected). Share/Revoke conditional on share token state.
  - Images: tabs · Copy URL (secondary, disabled when nothing selected; shows 'Copied ✓' for 3s on click) · Delete (secondary, disabled when nothing selected) · Upload Image (primary, rightmost).
- Tier 3: Panel headers — static labels only. STRUCTURE has lock toggle (hidden during diff view). EDITOR has find icon (edit mode only). AI CHAT and EVIDENCE panels have a ghost trash icon button (clear chat history). No other action buttons in panel headers.
- Panel titles: `text-lg font-semibold` — app chrome style, distinct from document content heading styles.
- Left panel pattern: clean list of names only — no metadata, no secondary lines, no bold, no icons/emoji. Selected state: bg-gray-100 text-gray-900. Hover: hover:bg-gray-100. Font: text-sm text-gray-700.
- Content panel pattern: when an item is selected, a metadata block appears at the top (key-value list, muted label + darker value, text-xs, bg-white border-b border-gray-100 p-6 flex-shrink-0). Content/preview renders below.

## Branding & Visual Theme
- TopBar: `bg-gray-900` (#111827) background, no bottom border. All interior elements white/light: text-white for titles, text-gray-300/text-gray-400 for secondary elements. Dropdown menu stays white.
- Primary buttons (MABs): `bg-gray-900` hover `bg-gray-800` — near-black, not blue. Applies to Button.jsx primary variant, ContextBar primary actions, SegmentedControl active state, ErrorBoundary refresh button, Send buttons in ChatPanel/EvidenceChatPanel/FeedbackBar.
- Active tab: 2px bottom border (`border-gray-900`), flush with ContextBar bottom edge. All tabs carry transparent `border-b-2` by default to prevent layout shift. Inactive hover: `hover:border-gray-300`.
- Secondary buttons: unchanged — light gray.
- Hyperlinks: blue (`text-blue-600`) throughout — convention retained.
- Chat bubbles: user messages stay blue (`bg-blue-600`) — conversational UI convention, functional distinction from AI responses. Do not change.
- Blue retired from all other buttons and focus rings. Straggler blue to be mopped up as spotted.
- Design intent: writing tool aesthetic — serious, content-first, not SaaS-generic.

## Landing Page
- No nav, no footer. Full-height white page, all content vertically and horizontally centred.
- Layout top to bottom: "SPEEDWRITE" (text-sm font-semibold tracking-widest uppercase text-gray-400) · "Write documents faster." (serif font — Lora via Google Fonts, text-3xl font-semibold text-gray-900) · "Create account" MAB (near-black, wide) · "Sign in" text link (text-blue-600 underline).
- Headline equidistant between brand name above and button below.
- Login page h1: "Sign in". Register page h1: "Create account".

## Core Features Built
- Auth (JWT), document CRUD, markdown editor.
- Registration toggle — REGISTRATIONS_OPEN env var (truthy: "true"/"1"/"yes" case-insensitive, anything else including absence = closed). Single source of truth in backend (registrations_open() helper). Public GET /auth/registration-status endpoint returns {"open": bool}; no auth required. POST /auth/register returns 403 when closed. Frontend Landing and Register pages fetch state on mount, assume closed until confirmed (avoids enabled-button flash). When closed: Landing's Create account button rendered disabled AND Link wrapper omitted (a disabled button inside a Link still navigates — React Router intercepts the wrapper click); Register page renders a short "registrations are closed" message with sign-in link, no form. Sign in unaffected in both states. Defaults closed; local dev sets to open in .env.
- Document tree (headings only).
- AI chat panel — single Send button. Mode is signalled by section attachment: no attachment = chat-only (AI never proposes changes); section attached = scoped rewrite. Diff view for proposals. Stop button. Enter key or button to send (user-configurable via localStorage).
- Diff view: read-only, no AI chat panel shown during diff review.
- Evidence base (file/URL/text/document sources) with RAG via Ollama (nomic-embed-text).
- Per-source RAG at send time with RAG badge.
- Embeddings stored as JSON, falls back to truncation if Ollama unavailable.
- Section picker — `+` button in chat panel opens a search-as-you-type list of headings. "Entire document" entry at the top of the picker for whole-document rewrites. Each heading carries a `path: {text, index, level}[]` ancestor path computed by `parseHeadingsWithContent` so duplicate sibling headings can be disambiguated unambiguously.
  - Section attachment char limits: ATTACHMENT_WARNING_THRESHOLD and ATTACHMENT_TRUNCATION_LIMIT both 10000.
  - Known trap: the Document chat component receives a prop named `document` which shadows the DOM global. Uses of the DOM global inside the component must go via `window.document`. A future rename of the prop would remove the trap but is deferred.
- Sectional editing (live) — backend uses `<proposed_section>` tags. AI returns only the rewritten section; backend splices it into the full document at the section's range; existing diff machinery runs unchanged on (old full doc, new full doc). Whole-document rewrites use the same path with the full document as scope. The chat-only path (no attachment) is enforced in the system prompt — the AI must respond conversationally and not return a `<proposed_section>` block.
- Rewrite summary — AI is instructed to add a 1–3 sentence summary outside the `<proposed_section>` tags describing what was changed and (for full-doc rewrites) what was deliberately left unchanged. The summary appears in the chat bubble alongside the diff view.
- Decline path — when the AI legitimately declines a rewrite (most commonly because structure is locked and the user asked for a structural change), the response has no `<proposed_section>` block. Backend passes the AI's plain-text reply through to the chat bubble unchanged. Genuinely empty responses surface a specific "empty response" error; partial-tag truncation falls into the pass-through branch (visible tag in the bubble — acceptable failure mode).
- Chat history isolation — every Document chat turn (rewrite-mode and chat-only) sends `ignore_history: true` to the LLM. Each turn is a fresh single-message exchange from the model's perspective. Reason: prior rewrite-turn assistant messages contain summary-style language that, in chat-only mode, drives the AI to hallucinate edits it cannot make. Chat history is still persisted and rendered in the UI; only the LLM call is scoped to the current turn. User-side mitigation if hallucination still occurs: clear chat history via the trash icon in the chat panel header.
- Evidence active/inactive toggle — custom checkbox on each source in EvidenceSidebar. Active sources included in RAG and full-dump; inactive excluded entirely from all AI context (RAG retrieval, full-dump, and source inventory). Persistent per source (`active` field, absence = active). Optimistic update with revert on error. New sources default to active. EvidenceChatPanel trash icon turns near-black with stale tooltip when active sources change after last send — clears on send or clear chat.
- Evidence chat panel (third panel on Evidence page) — automatically injects full evidence base (active sources only) into system prompt on every request; source inventory (active sources only) always injected unconditionally. Attachment = focus on specific source (mutually exclusive with auto evidence block).
- "All sources" attachment option removed — redundant and broken due to truncation. Replaced with explanatory note in the attachment popup.
- Clear chat history — ghost trash icon button in AI CHAT and EVIDENCE panel headers. Calls DELETE endpoints on backend, resets local message state immediately. In Evidence chat, turns near-black when active source set has changed since last send.
- Global search (command palette, Cmd/Ctrl+K).
- Document history (snapshots every 10 saves, on AI rewrite, manual; restore via diff view).
  - Snapshot labels: "Auto save" (auto), "Before AI rewrite" (rewrite), "Before restore" (restore), user-defined (manual).
  - Snapshots capture pre-change state — intentional; they serve as escape hatches.
  - Trigger passed explicitly from frontend; backend does not infer from label text.
- Lock Structure toggle (icon-only with tooltip, in STRUCTURE panel header).
  - Prevents AI from adding, removing, reordering, or renaming sections; content within sections can still be rewritten.
  - User can still edit structure freely — AI-only constraint.
  - `structure_locked` boolean stored per document (JSON, defaults to False).
  - Dedicated lock-structure/unlock-structure endpoints.
  - When the user requests a structural change while structure is locked, the AI declines in chat (plain text, no `<proposed_section>` block) and explains. Strengthened from earlier permissive phrasing.
  - Locked heading styling visible in Preview mode and diff view only. Heading lines under structure lock render muted in DiffView for `equal` entries; `add` and `remove` entries always render in standard green/red livery so violations remain visible.
  - Lock state shown on panel header toggle only. No per-heading lock affordance.
- Per-section locks retired. Sectional editing handles scope via attachment — to leave a section untouched, simply don't attach it. The structure lock remains as the one global constraint affordance.
- Duplicate source detection — amber banner in SOURCE DETAIL for duplicate URLs.
- Refresh sources — Update source / Update all sources in Evidence ContextBar (Tier 2). Applies to URL and document sources uniformly.
  - On refresh: overwrites content from the live source (URL re-fetch or linked document content), auto-reindexes, updates last_fetched_at.
  - On failure: amber "Last update failed" banner in SOURCE DETAIL.
  - Document sources are snapshot-only — no live-read mode. The earlier Sync on/off toggle has been retired; all source types behave identically.
- Document description — Describe button in Library ContextBar. Always visible, disabled when nothing selected. Fixed label "Describe" (with "Describing…" / "Described ✓" states). AI generates four-section structured markdown: Summary · Key themes · Key arguments · Open questions, 3-5 short bullets each. Stored in doc.description. Rendered in DOCUMENT DETAIL panel as hand-rolled app-styled sections (small-caps heading + indented · bullets). Metadata (Created · Last updated · Words) rendered as key-value list above description. Title always doc.title (filename), never from content.
- Source description — Describe button in Evidence ContextBar. Always visible, disabled when nothing selected. Same four-section format as document description. Stored as description field on evidence item via POST /documents/{doc_id}/evidence/{evidence_id}/describe. Rendered in SOURCE DETAIL panel with same hand-rolled renderer. Raw content display removed — description replaces it. liveContent fetch retained for Words count. Cap enforced.
- Detail panel rendering pattern — both DOCUMENT DETAIL and SOURCE DETAIL use the same hand-rolled section renderer: parse stored markdown (split on ## headings, extract bullet lines), render as small-caps label + pl-3 indented · bullets in app styles. No MarkdownPreview in detail panels — full app chrome styling throughout.
- Source Detail metadata — key-value list. No pill badges, no large icon. URL: Type·URL·Added·Last updated·Words. File: Type·Added·Words·Size. Text: Type·Added·Words. Document: Type·Added·Last updated·Words·Source doc. "Last updated" row omitted uniformly when last_fetched_at is absent. timeAgo full words.
- Image Detail metadata — key-value list (Filename · Size) above image. Panel header always "Image Detail" (static).
- History VERSION metadata — key-value list (Label · Saved · Trigger · Shared · Comments) above MarkdownPreview. Left panel shows label only.
- Export — Export ▾ dropdown in Document ContextBar; options: .txt · .md · .pdf (in that order). Dropdown hidden when proposal pending. .md exports raw markdown content as-is. Filenames sanitised (spaces → underscores).
- Import — button in Library ContextBar; accepts .docx, .md, .txt. Tooltip: "Supports .docx, .md, .txt". .md and .txt read as UTF-8 directly; .docx via mammoth → html2text. Title from filename.
- Welcome document — template stored at DATA_DIR/welcome_document.md. On new user registration, if template exists, a copy is created as the user's first document (title from H1, fallback "Getting Started"). Admin sets the template via "Save as welcome" button in Document ContextBar (visible to admins only, hidden during diff view). Failure is silent — if no template exists, new users get an empty library.
- Editor mode persistence — last used mode (Edit/Preview) stored in localStorage per document ID. Default when no saved mode: Preview if content exceeds 50 chars, Edit otherwise. New document stub (`# Untitled\n\n` = 14 chars) correctly defaults to Edit.
- AI chat max_tokens: 8192. Truncated-response detection retired alongside `<proposed_document>` — a truncation that loses the closing tag now falls into the decline pass-through and the user sees the partial text in the chat bubble.
- Heading navigation — clicking a heading in the Structure panel scrolls to that heading in both Edit and Preview modes.
- Ollama chat path dormant (_complete_ollama() retained in llm.py).
- Find in document — magnifying glass in Editor panel header (edit mode only). Ctrl+F / Cmd+F also opens.
- Edit/Preview toggle — SegmentedControl in Document ContextBar (rightControls). Hidden during diff view.
- Save version button — "Saving…" → "Saved ✓" → reverts after 3s.
- Preview full-width.
- Password reset and account management — ResetRequest → SendGrid → ResetConfirm. Account page: Usage · Profile · Change email · Change password · BYOK · Delete account. All buttons via Button.jsx.
- Duplicate document — copies content/structure_locked; " (copy)" suffix. (Per-section lock data on existing docs is silently dropped on read after the per-section lock retirement.)
- Markdown preview — react-markdown + remark-gfm. AuthImage fetches internal images as blobs.
- Images — per-document. Upload, Copy URL, Delete. Auth-required serve; frontend fetches as blob.
- Preserve markdown — _PRESERVE_INSTRUCTION at top of system prompt in chat.py.
- Free tier limits — FREE_ACTION_CAP 1000, FREE_EVIDENCE_LIMIT 50. Abuse guards only.
- Error boundary, onboarding empty states.
- Overloaded API error (529) caught in llm.py as anthropic.APIStatusError with status_code==529; raises HTTP 503 with user-friendly message surfaced as assistant bubble in chat.
- Left panel consistency: emoji/icons removed from all left panel lists (Evidence, History); Sidebar.jsx (dead code) deleted.
- Admin.jsx: table header bg-gray-50, summary line text-gray-600.
- Empty assistant chat bubble fix: bubble not rendered when content is empty/whitespace.
- attachmentLimits.js: ATTACHMENT_TRUNCATION_LIMIT and ATTACHMENT_WARNING_THRESHOLD both 10000.
- Resizable panels — Document, Evidence, History, Images pages have draggable gutters between panels. Widths persist per-page in localStorage (key `speedwrite_panel_widths_{page}`). Min widths: sidebars 180px, chat/detail panels 300px, middle 300px. Computed at drag start against the current window width. Images is two-panel (one gutter); the others are three-panel (two gutters).
- MarkdownPreview variant — accepts `variant="document"` (default, document-reading typography) or `variant="chat"` (compact heading scale for chat bubbles). Both chat panels use the chat variant. Structure-lock heading highlighting only applies in the document variant.
- History left panel — each version row renders a fixed-width `DD Mon HH:MM` timestamp in a muted monospace style, followed by the label. Disambiguates repeated labels (multiple "Manual checkpoint" rows) at a glance.

## Diff View — Known Visual Quirk
DiffView uses line-based diffing. When a rewritten paragraph happens to share a verbatim line with the original (e.g. an unchanged opening sentence in an otherwise rewritten paragraph), or when a long contiguous run of unchanged lines later in the document anchors the LCS aligner, lines that look "new" to a human can render as muted context. This is the diff working correctly at the line level, not a bug. We considered switching to paragraph-level or word-level diff and decided not to: rare in practice, real diff tools behave the same way. Revisit if it confuses real users.

## Design Decisions (see CLAUDE.md)
- "Add to chat" (arbitrary text selection) retired. The section picker is the only scope declaration mechanism.
- Single Send button — mode signalled by section attachment, not by a separate toggle. Do not re-add Edit/Chat split.
- Search overlay + AddSourceModal are the only intentional modals.
- shadcn/ui migration deferred.
- LLM abstraction via llm.py; Ollama chat path dormant.
- Anthropic Claude: Haiku 4.5 on the env-key path (default), Sonnet 5 on BYOK. Model IDs are dateless pinned snapshots from the 4.6 generation onward — do not add date suffixes.
- Diff view read-only — no AI chat panel shown during diff review. During diff view: Edit/Preview toggle hidden, structure lock toggle hidden. Accept is primary (near-black), Reject is secondary. Tree node click-to-scroll non-functional during diff view — will be resolved by minimap feature.
- Lock Structure in STRUCTURE panel header (Tier 3), AI-only. Per-section locks retired — sectional editing replaces the use case.
- Sectional editing is live: backend returns `<proposed_section>` and splices into the full document. Whole-document rewrites use the same path with "Entire document" as scope. Do not re-introduce `<proposed_document>`.
- Section identity uses an ancestor path of `{text, index, level}` steps — disambiguates duplicate sibling headings. Both frontend and backend agree on the shape; backend filters by text+level before applying index.
- Structure lock instruction is absolute — when the user requests a structural change, the AI declines in chat. Earlier "always proceed with the rewrite, doing as much as permitted" phrasing has been removed.
- Rewrite responses include a 1–3 sentence summary outside the `<proposed_section>` block. The chat bubble shows it alongside the diff.
- Plain-text responses on rewrite turns are passed through as the chat bubble (declines are first-class). Only an empty response is treated as an error.
- DiffView protected-line rendering applies only to `equal` entries. `add` and `remove` always render in standard green/red livery — protects visibility of any constraint violation.
- Chat-only turns send `ignore_history: true`. Trade-off: prior rewrite turns in history caused the AI to hallucinate edits in chat-only mode (Haiku mimics in-context summary patterns). The cure: every Document chat turn is a fresh single-message exchange to the LLM. Multi-turn discussion continuity in chat-only mode is sacrificed in favour of correctness. If hallucination resurfaces despite this, clearing the chat history is the user-side reset.
- Export on Document page only — action on open document, not list operation.
- Templates removed — do not re-add.
- Redraft and Insights removed — do not re-add.
- Document title is a filename — only changes on explicit rename, never auto-derived from H1.
- Back arrow replaces SpeedWrite logo + Close button on document/account/admin pages.
- Model/usage in Account settings, not TopBar.
- Library/Evidence actions in Tier 2 — always visible, disabled when nothing selected, one primary at a time.
- Primary actions rightmost among buttons in the ContextBar. Buttons are never hidden when inactive — disable them instead. Exception: during diff view, irrelevant controls are hidden entirely.
- ContextBar overflow menu — supported via `overflow` prop (vertical-dots icon, sits right of primary, disabled state rules apply inside the menu as outside). Currently unused by any page. Available as a release valve when a page's visible action count grows beyond comfort.
- Panel headers always static labels — never dynamic. All actions in Tier 2. Exception: clear chat icon in AI CHAT and EVIDENCE panel headers (Tier 3) — justified as panel-scoped action.
- Left panel = name list only. Content panel = metadata block at top when selected, content below. Exception: EvidenceSidebar has custom checkboxes left of each item — justified as bulk interaction need.
- Evidence chat attachment = focus on specific source only. No attachment = auto evidence block (active sources only, full dump or RAG). Never both. "All sources" option removed — do not re-add.
- Evidence source active/inactive: persistent toggle, exclusion at retrieval time (not by removing embeddings). Inactive sources stay in list. New sources default to active. Stale chat warning when active set changes after last send — user clears manually.
- Evidence chat source inventory always injected unconditionally (active sources only, titles + types, no content).
- RAG retrieval filtered to active source IDs — inactive sources excluded from chunk scoring even if embeddings exist.
- RAG threshold unchanged — increasing it delays rather than solves context limit issues.
- Edit/Preview toggle in Tier 2 rightControls — hidden entirely during diff view (not disabled).
- Save version feedback via button label.
- Preview full-width. Minimum width 1024px.
- **Branding:** Near-black (`bg-gray-900` / `#111827`) TopBar and primary buttons including Send buttons. Writing tool aesthetic — not SaaS-generic. Blue retired from all buttons and focus rings. Active tab: 2px near-black underline flush with ContextBar bottom. Secondary buttons unchanged (light gray). Hyperlinks stay blue — convention retained. Chat bubbles stay blue — do not change.
- **Landing page:** No nav, no footer. Centred. Lora serif headline. Do not re-add nav or footer.
- **Import:** Single button (not dropdown) — file picker handles format selection. Tooltip conveys supported formats.
- **Export filenames:** Spaces replaced with underscores — intentional, consistent across all formats.
- **Welcome document:** Admin sets via "Save as welcome" in Document ContextBar. No template = no welcome doc for new users. Do not hardcode content.
- **Editor mode:** Persisted per document in localStorage. Default (no saved mode): Preview if content > 50 chars, Edit otherwise. New document stub is 14 chars — correctly defaults to Edit.
- **App chrome vs document content typography:** Panel titles use `text-lg font-semibold`. Never use document heading styles in app chrome.
- **Detail panel description rendering:** Hand-rolled parser/renderer — no MarkdownPreview in detail panels.
- **Description content:** Four sections — Summary · Key themes · Key arguments · Open questions. 3-5 short single-line bullets each. Title always sourced from doc.title / item.title in frontend.
- Source Detail metadata: key-value list, no pill badges, no large icon. timeAgo full words. Document sources no longer carry a sync toggle — all evidence types are snapshot-refresh-on-demand.
- CLAUDE.md must stay under 50,000 characters (/finish trims to a 40,000-character target when triggered).
- Monetisation abandoned — personal tool, BYOK for cost control, caps are abuse guards.
- Password reset: mailer.py not email.py.
- Embeddings via Ollama on host at 172.17.0.1:11434 (Docker gateway to host).
- Stale frontend assets: down + volume rm speedwrite_frontend_dist + up --build.
- Env var changes: down + up (not restart).
- MarkdownPreview: node.position 1-indexed → subtract 1; AuthImage standalone.
- Images in SharedView: 401 for unauthenticated — acceptable for now.
- Preserve markdown: CRITICAL framing; fallback is pre/post processing.
- History snapshots: pre-change capture intentional.
- Free tier limits: 1000 actions / 50 sources — abuse guards; enforcement intact.
- ContextBar rightControls: renders inside actions flex row.

## Backlog

### Code quality
- Backend smoke tests — pytest suite covering auth (register, login, token), document CRUD, import, export, and search happy paths. ~30-40 tests, runnable in under a minute. No tests currently exist.
- Hand-rolled button sweep — opportunistic. Next time we're in a major UI file for another reason, grep for `bg-blue-` and any standalone `<button>` elements as canaries for buttons that bypass Button.jsx. Each hit is a candidate for refactor to the canonical primary/secondary/ghost variants. Low urgency — fix as encountered, not as a dedicated pass.

### Features (priority order)
- Export .docx — slots into Export ▾ dropdown after .md, before .pdf, once backend ready.
- Folders — organise documents in the library.
- Diff view minimap — replace the document tree in the Structure panel during diff view with a minimap: zoomed-out, non-interactive representation of the full diff with red/green/grey blocks for removed/added/unchanged lines, clickable to scroll DiffView to that position. Resolves the known limitation that tree click-to-scroll does not work during diff view. Do not patch tree scroll for diff view in the meantime — the minimap is the right solution.
- RAG active indicator — show a subtle note in the Evidence chat panel when RAG is active (evidence base large enough to trigger retrieval). Requires backend to return a flag in the evidence-chat response.
- Improve search — direction to be determined after stress testing current performance.
- Preserve markdown fallback — only if Haiku compliance degrades.
- shadcn/ui migration — deferred.
- Mobile/responsive — out of scope.
