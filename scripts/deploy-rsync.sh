#!/usr/bin/env bash
# Kompyuterdan VPS ga yuklash
# Ishlatish: bash scripts/deploy-rsync.sh user@SERVER_IP

set -euo pipefail

TARGET="${1:?Ishlatish: bash scripts/deploy-rsync.sh user@SERVER_IP}"
REMOTE_DIR="${2:-/var/www/mkus-crm}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo ">> $ROOT → $TARGET:$REMOTE_DIR"

rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude prisma/*.db \
  --exclude prisma/*.db-journal \
  --exclude .env \
  "$ROOT/" "$TARGET:$REMOTE_DIR/"

echo ""
echo ">> Serverda bajarish:"
echo "   ssh $TARGET"
echo "   cd $REMOTE_DIR"
echo "   npm ci && npm run build && npm run db:push"
echo "   pm2 restart mkus-crm || pm2 start ecosystem.config.cjs"
echo ""
echo "   yoki Docker:"
echo "   docker compose up -d --build"
