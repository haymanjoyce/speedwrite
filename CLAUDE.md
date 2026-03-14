# LogbookLM — Claude Code Context

## Project Overview

LogbookLM is an AI-assisted document authoring platform. The core unit is a document — each document has its own evidence base, AI chat, and markdown content.

## Repository Structure

```
logbooklm/
├── backend/          # FastAPI app (Python 3.12)
├── frontend/         # React 18 + Vite + Tailwind CSS
├── nginx/            # Nginx reverse proxy configs
├── docker-compose.yml
├── bootstrap.sh      # One-time VPS setup script
├── deploy.sh         # Redeploy script (git pull + docker build)
└── CLAUDE.md         # This file
```

## Docker Stack

| Service    | Image / Build  | Internal Port | Purpose                            |
|------------|---------------|---------------|------------------------------------|
| `app`      | `./backend`    | 8000          | FastAPI backend                    |
| `frontend` | `./frontend`   | —             | Build-only; copies /dist to volume |
| `nginx`    | nginx:1.27     | 80, 443       | Reverse proxy + static file server |

All services share an internal Docker bridge network called `internal`.
`/var/logbooklm` is mounted into `app` for persistent data.

## Running Locally

```bash
# Copy and populate .env first
cp .env.example .env   # (create this when needed)

docker compose up --build
```

- Backend API: http://localhost:8000
- Health check: http://localhost:8000/health

## Deploying to Production

```bash
# First time only — run as root on a fresh Ubuntu 24.04 VPS
bash bootstrap.sh

# Subsequent deploys
bash deploy.sh
```

## Data Directories

| Path                          | Purpose                          |
|-------------------------------|----------------------------------|
| `/var/logbooklm/projects`     | Per-project data / session files |

## Key Commands

```bash
# View logs
docker compose logs -f app

# Restart a single service
docker compose restart app

# Rebuild everything
docker compose up --build -d

# Check container health
docker compose ps
```
