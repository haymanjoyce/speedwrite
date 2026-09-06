# SpeedWrite

AI-assisted document authoring. The core unit is a **document** — each one has its own
evidence base, AI agent chat, version history and markdown content.

> **Status: retired (September 2026).** SpeedWrite was built as a personal tool and is no
> longer developed or hosted. Two real-world tasks — a report-writing job and a
> personal-archive-synthesis job — were both better served by existing tools
> (Claude/Cowork, NotebookLM) than by this app, and no gap remained that justified
> further development or a pivot. The code still runs locally via Docker Compose.
> See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for the full history and rationale.

## What it does

A focused writing tool: the journey from blank page to polished document, AI-assisted.
Deliberately simple — anyone familiar with a word processor should feel at home. It is a
desktop/laptop tool (minimum window width 1024px).

- **Markdown editor** with Edit/Preview toggle, autosave, find-in-document, and a
  heading-based structure tree for navigation.
- **Sectional AI editing** — you attach a section (or the whole document) via the `+`
  picker in the chat panel, and the AI rewrites only that scope. Changes arrive as an
  inline diff you accept or reject. With nothing attached, the chat is conversational
  only and cannot touch the document.
- **Evidence base** per document — files (`.pdf`, `.txt`, `.md`, `.docx`), URLs, pasted
  text, or other documents. Sources can be toggled active/inactive, refreshed from the
  live source, and described by the AI. A separate evidence chat panel lets you
  interrogate the sources without editing the document.
- **RAG** — evidence is chunked and embedded via Ollama (`nomic-embed-text`); large
  evidence bases retrieve the top matching chunks instead of dumping everything into
  context. Falls back to a full context dump if Ollama is unreachable.
- **Structure lock** — prevents the AI from adding, removing, reordering or renaming
  sections while still allowing content rewrites. You remain free to edit structure
  yourself.
- **Version history** — snapshots every 10 saves, before every AI rewrite, and on
  demand. Any version can be restored (via the same diff-and-accept flow) or shared by
  link for read-only viewing and comments.
- **Import/export** — import `.docx`, `.md`, `.txt`; export `.txt`, `.md`, `.pdf`.
- **Images** per document, **global search** (Cmd/Ctrl+K), document descriptions,
  password reset, and a read-only admin view.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, react-markdown |
| Backend | FastAPI (Python 3.12), JWT auth |
| LLM | Anthropic Claude — Haiku 4.5 (shared key) / Sonnet 5 (BYOK) |
| Embeddings | Ollama `nomic-embed-text`, running on the host |
| Serving | Nginx reverse proxy + static files |
| Orchestration | Docker Compose |
| Storage | JSON files on disk — no database |
| Email | SendGrid (password reset, feedback) |

## Repository layout

```
speedwrite/
├── backend/            FastAPI app — auth, documents, chat, evidence,
│                       embeddings, search, export, sharing, images, admin
├── frontend/src/       React app — pages/, components/, api.js
├── nginx/              local + production nginx configs
├── docker-compose.yml  frontend (build-only) · app · nginx
├── bootstrap.sh        first-time production setup
├── deploy.sh           subsequent production deploys
├── CLAUDE.md           working context for Claude Code (conventions, invariants)
└── PROJECT_SUMMARY.md  canonical project summary and design decisions
```

## Running locally

Requires Docker and, for embeddings, [Ollama](https://ollama.com) on the host.

```bash
cp .env.example .env          # populate JWT_SECRET and ANTHROPIC_API_KEY at minimum
ollama pull nomic-embed-text  # optional — RAG degrades gracefully without it
docker compose up --build
```

- App: http://localhost
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

`docker-compose.override.yml` is auto-merged locally: it exposes the backend on port
8000, uses a local named volume for data, and swaps in the local nginx config. It must
never run in production — `deploy.sh` passes `-f docker-compose.yml` explicitly to
prevent that.

Registration is closed by default. `.env.example` sets `REGISTRATIONS_OPEN=true` so you
can create the first account locally.

## Configuration

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | JWT signing secret |
| `ANTHROPIC_API_KEY` | Anthropic API key (users may supply their own via BYOK instead) |
| `ENCRYPTION_KEY` | Fernet key encrypting BYOK keys at rest |
| `OLLAMA_HOST` | Ollama base URL — `http://host.docker.internal:11434` on Windows/Mac, `http://172.17.0.1:11434` on a Linux host |
| `SENDGRID_API_KEY` | Required for password reset and feedback emails |
| `EMAIL_FROM` | Sender address (default `noreply@speedwrite.app`) |
| `FEEDBACK_EMAIL` | Feedback recipient (defaults to `EMAIL_FROM`) |
| `APP_URL` | Public URL used in email links |
| `REGISTRATIONS_OPEN` | `true`/`1`/`yes` to accept signups; anything else, including absence, means closed |

`LLM_PROVIDER` and `OLLAMA_CHAT_MODEL` exist but are dormant — the Ollama chat path is
retained in `backend/llm.py` and unused.

## Data

All state lives as JSON files under `/var/speedwrite` inside the container (a Docker
volume locally):

| Path | Contents |
|------|----------|
| `users.json` | All user accounts |
| `documents/{user_id}/{doc_id}.json` | Content, evidence, chat history, version history |
| `documents/{user_id}/evidence/{doc_id}/` | Uploaded evidence files |
| `documents/{user_id}/{doc_id}/images/` | Uploaded images |
| `embeddings/{user_id}/{doc_id}.json` | Chunked evidence embeddings |
| `welcome_document.md` | Optional template copied into every new account |

Free-tier guards (`backend/limits.py`): 1000 AI actions/month and 50 evidence sources
per document. These are abuse guards, not a paywall — BYOK users bypass the action cap.
Admin access is granted by setting `"is_admin": true` on a user record in `users.json`;
there is no UI for it.

## Deploying

Production ran on a single VPS behind a Cloudflare tunnel (nginx speaks plain HTTP; no
Certbot involved).

```bash
bash bootstrap.sh   # first time only — set EMAIL inside the script first
bash deploy.sh      # subsequent deploys
```

A daily cron installed by `bootstrap.sh` runs `backend/cleanup.py` to clear expired
reset tokens and stale action counters.

## Notes for anyone reading the code

`CLAUDE.md` documents the conventions this codebase actually follows — the three-tier
navigation hierarchy, the no-modal rule, control-type rules, and a list of features that
were removed on purpose and should not be re-added (templates, audit log, per-section
locks, "Add to chat"). `PROJECT_SUMMARY.md` records the design decisions with their
rationale. Between them they explain most of the "why is it like this?" questions the
code alone won't answer.

There is no automated test suite — a backend smoke-test suite was on the backlog when
the project was retired.
