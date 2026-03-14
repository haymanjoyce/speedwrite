#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/haymanjoyce/logbooklm"
REPO_DIR="/opt/logbooklm"
DOMAINS=("logbooklm.com")
ADMIN_USER="richard"
EMAIL="admin@logbooklm.com"   # update before running

echo "==> [1/9] Updating and hardening Ubuntu"
apt-get update -y && apt-get upgrade -y
apt-get install -y \
    fail2ban \
    ufw \
    unattended-upgrades \
    curl \
    git

# UFW: allow SSH, HTTP, HTTPS
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# SSH hardening
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Unattended upgrades
dpkg-reconfigure -plow unattended-upgrades

echo "==> [2/9] Installing Docker and Docker Compose"
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
systemctl enable docker
systemctl start docker

echo "==> [3/9] Installing certbot"
apt-get install -y certbot python3-certbot-nginx

echo "==> [4/9] Creating admin user '${ADMIN_USER}' if not exists"
if ! id "${ADMIN_USER}" &>/dev/null; then
    adduser --disabled-password --gecos "" "${ADMIN_USER}"
    usermod -aG sudo,docker "${ADMIN_USER}"
    echo "User '${ADMIN_USER}' created."
else
    echo "User '${ADMIN_USER}' already exists."
fi

echo "==> [5/9] Cloning repo to ${REPO_DIR}"
if [ ! -d "${REPO_DIR}/.git" ]; then
    git clone "${REPO_URL}" "${REPO_DIR}"
else
    echo "Repo already cloned, pulling latest."
    git -C "${REPO_DIR}" pull origin main
fi

echo "==> [6/9] Creating data directories"
mkdir -p /var/logbooklm/projects
chown -R "${ADMIN_USER}:${ADMIN_USER}" /var/logbooklm

echo "==> [7/9] Obtaining SSL certificates"
for domain in "${DOMAINS[@]}"; do
    if [ ! -d "/etc/letsencrypt/live/${domain}" ]; then
        certbot certonly --nginx --non-interactive --agree-tos \
            --email "${EMAIL}" -d "${domain}"
    else
        echo "Cert for ${domain} already exists."
    fi
done

echo "==> [8/9] Starting Docker stack"
cd "${REPO_DIR}"
docker compose up --build -d

echo "==> [9/9] Health check"
sleep 5
if curl -sf http://localhost:8000/health > /dev/null; then
    echo "Health check PASSED."
else
    echo "Health check FAILED. Check logs: docker compose logs app"
    exit 1
fi

echo ""
echo "Bootstrap complete!"
