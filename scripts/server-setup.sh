#!/usr/bin/env bash
# VPS ga bir martalik o'rnatish (Ubuntu 22/24)
# Ishlatish: sudo bash scripts/server-setup.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/mkus-crm}"
APP_USER="${APP_USER:-www-data}"

echo "==> Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Nginx, Certbot, PM2..."
apt-get update
apt-get install -y nginx certbot python3-certbot-nginx
npm install -g pm2

echo "==> Papka: $APP_DIR"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR" 2>/dev/null || true

cat <<EOF

========================================
Keyingi qadamlar (qo'lda):

1) Loyihani serverga yuklang:
   rsync yoki git clone → $APP_DIR

2) Sozlang:
   cd $APP_DIR
   cp .env.example .env
   nano .env          # JWT_SECRET o'zgartiring!

3) Ishga tushiring:
   npm ci
   npm run build
   npm run db:push
   npm run db:seed    # birinchi marta
   pm2 start ecosystem.config.cjs
   pm2 save && pm2 startup

4) Nginx:
   cp deploy/nginx.conf.example /etc/nginx/sites-available/mkus-crm
   nano /etc/nginx/sites-available/mkus-crm   # domenni yozing
   ln -sf /etc/nginx/sites-available/mkus-crm /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d SIZNING-DOMEN.uz

========================================
Docker bilan (osonroq):
   cd $APP_DIR
   cp .env.production.example .env && nano .env
   docker compose up -d --build

EOF
