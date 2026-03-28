#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# SpeedWrite Bootstrap Script
# Run once on a fresh Hetzner Ubuntu 24.04 VPS.
# Prerequisites:
#   - Tailscale already installed and connected (run before locking firewall)
#   - EMAIL variable set below
#   - After this script: complete Cloudflare tunnel setup manually (see step 8)
# =============================================================================

REPO_URL="https://github.com/haymanjoyce/speedwrite"
REPO_DIR="/opt/speedwrite"
DATA_DIR="/var/speedwrite"
ADMIN_USER="richard"
EMAIL=""  # Set this before running — used for fail2ban/system notifications

if [ -z "${EMAIL}" ]; then
    echo "ERROR: Set the EMAIL variable before running bootstrap.sh"
    exit 1
fi

echo "==> [1/9] Updating system packages"
apt-get update -y && apt-get full-upgrade -y
apt-get install -y \
    curl \
    git \
    ufw \
    fail2ban \
    unattended-upgrades

echo "==> [2/9] Configuring firewall (Tailscale-only SSH)"
ufw default deny incoming
ufw default allow outgoing
# Allow SSH only from Tailscale subnet
ufw allow in on tailscale0 to any port 22 proto tcp
# Allow HTTP from Cloudflare tunnel (cloudflared runs on host, connects to localhost:80)
ufw allow 80/tcp comment 'Cloudflare tunnel ingress'
ufw --force enable
ufw status verbose

echo "==> [3/9] SSH hardening"
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PermitEmptyPasswords.*/PermitEmptyPasswords no/' /etc/ssh/sshd_config
systemctl restart ssh

echo "==> [4/9] Configuring fail2ban and unattended upgrades"
systemctl enable --now fail2ban
cat <<EOF > /etc/apt/apt.conf.d/50unattended-upgrades
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
EOF
dpkg-reconfigure --priority=low unattended-upgrades

echo "==> [5/9] Installing Docker"
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin
systemctl enable --now docker

echo "==> [6/9] Configuring Docker log rotation"
cat <<EOF > /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

echo "==> [7/9] Installing Ollama and pulling embedding model"
curl -fsSL https://ollama.com/install.sh | sh
systemctl enable --now ollama
# Wait for Ollama to be ready
sleep 5
ollama pull nomic-embed-text

echo "==> [8/9] Installing Cloudflare tunnel (cloudflared)"
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
    -O /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

echo ""
echo "==========================================================="
echo "  MANUAL STEP REQUIRED: Cloudflare Tunnel Setup"
echo "==========================================================="
echo ""
echo "Run the following commands to set up the Cloudflare tunnel:"
echo ""
echo "  cloudflared tunnel login"
echo "  (opens browser — authenticate with your Cloudflare account)"
echo ""
echo "  cloudflared tunnel create speedwrite"
echo "  cloudflared tunnel route dns speedwrite speedwrite.app"
echo ""
echo "  Then create /etc/cloudflared/config.yml with:"
echo ""
echo "  tunnel: <your-tunnel-id>"
echo "  credentials-file: /root/.cloudflared/<your-tunnel-id>.json"
echo "  ingress:"
echo "    - hostname: speedwrite.app"
echo "      service: http://localhost:80"
echo "    - service: http_status:404"
echo ""
echo "  Then run:"
echo "  cloudflared service install"
echo "  systemctl enable --now cloudflared"
echo ""
echo "==========================================================="
echo ""

echo "==> [9/9] Creating admin user and cloning repo"
if ! id "${ADMIN_USER}" &>/dev/null; then
    adduser --disabled-password --gecos "" "${ADMIN_USER}"
    usermod -aG sudo,docker "${ADMIN_USER}"
    echo "User '${ADMIN_USER}' created. Add their SSH key to ~/.ssh/authorized_keys"
fi

if [ ! -d "${REPO_DIR}/.git" ]; then
    git clone "${REPO_URL}" "${REPO_DIR}"
else
    git -C "${REPO_DIR}" pull origin main
fi

mkdir -p "${DATA_DIR}"
chown -R "${ADMIN_USER}:${ADMIN_USER}" "${DATA_DIR}"

echo "==> Installing cleanup cron job (daily at 3am)"
CRON_JOB="0 3 * * * docker exec speedwrite-app python cleanup.py >> /var/log/speedwrite-cleanup.log 2>&1"
CRON_TMP="$(mktemp)"
crontab -l 2>/dev/null > "${CRON_TMP}" || true
if ! grep -qF "${CRON_JOB}" "${CRON_TMP}"; then
    echo "${CRON_JOB}" >> "${CRON_TMP}"
    crontab "${CRON_TMP}"
    echo "Cron job installed."
else
    echo "Cron job already present, skipping."
fi
rm -f "${CRON_TMP}"

echo ""
echo "Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Complete the Cloudflare tunnel setup shown above"
echo "  2. cd ${REPO_DIR} && cp .env.example .env"
echo "  3. Edit .env — set JWT_SECRET, ANTHROPIC_API_KEY, SENDGRID_API_KEY,"
echo "     EMAIL_FROM, APP_URL, OLLAMA_HOST=http://172.17.0.1:11434"
echo "  4. docker compose up --build -d"
echo "  5. curl http://localhost:8000/health  (should return ok)"
