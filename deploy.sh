#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/opt/speedwrite"
cd "${REPO_DIR}"

echo "==> Pulling latest code"
git pull origin main

echo "==> Rebuilding and restarting containers"
docker compose -f docker-compose.yml up --build -d

echo ""
echo "==> Container status"
docker compose ps

echo ""
echo "Deploy complete."
