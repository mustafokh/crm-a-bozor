#!/usr/bin/env bash
# Oracle Cloud Ubuntu VM da bir marta ishga tushiring:
#   curl -fsSL https://raw.githubusercontent.com/.../oracle-setup.sh | bash
# yoki loyiha ichida:
#   sudo bash scripts/oracle-setup.sh
#
# Oracle Always Free (ARM Ampere A1) uchun optimallashtirilgan.

set -euo pipefail

echo "=========================================="
echo "  MKUS CRM — Oracle Cloud o'rnatish"
echo "=========================================="

if [ "$(id -u)" -ne 0 ]; then
  echo "sudo bilan ishga tushiring: sudo bash scripts/oracle-setup.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo ">> Tizim yangilanmoqda..."
apt-get update -qq
apt-get upgrade -y -qq

echo ">> Kerakli paketlar..."
apt-get install -y -qq curl git ufw nginx certbot python3-certbot-nginx

echo ">> Docker o'rnatilmoqda..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable docker
systemctl start docker

# docker compose plugin
if ! docker compose version &>/dev/null; then
  apt-get install -y -qq docker-compose-plugin 2>/dev/null || true
fi

echo ">> Firewall (22, 80, 443)..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

APP_DIR="/opt/mkus-crm"
mkdir -p "$APP_DIR"
chown -R "${SUDO_USER:-ubuntu}:$(id -gn "${SUDO_USER:-ubuntu}" 2>/dev/null || echo ubuntu)" "$APP_DIR" 2>/dev/null || true

echo ">> Nginx reverse proxy..."
cat > /etc/nginx/sites-available/mkus-crm <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/mkus-crm /etc/nginx/sites-enabled/mkus-crm
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

cat <<EOF

==========================================
  Oracle VM tayyor!
==========================================

Keyingi qadamlar:

1) Kompyuteringizdan loyihani yuklang:
   bash scripts/deploy-rsync.sh ubuntu@ORACLE_PUBLIC_IP /opt/mkus-crm

2) Serverda (.env sozlang):
   cd /opt/mkus-crm
   cp .env.production.example .env
   nano .env
   # JWT_SECRET: openssl rand -base64 32
   # SEED_DB=true  (birinchi marta)

3) Ishga tushiring:
   cd /opt/mkus-crm
   docker compose up -d --build

4) Brauzerda oching:
   http://ORACLE_PUBLIC_IP

5) Domen bo'lsa SSL:
   certbot --nginx -d crm.sizning-domen.uz

Login: admin@abozor.uz / admin123  (keyin o'zgartiring!)

EOF
