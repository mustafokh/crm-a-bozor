#!/bin/sh
# Azure App Service startup — /home is persistent
set -e
cd /home/site/wwwroot 2>/dev/null || cd "$(dirname "$0")"

mkdir -p "${AUTH_DIR:-/home/auth_info}"

# Keep deps on persistent /home so cold starts skip multi-minute tar extract.
WA_NM="${WA_NODE_MODULES:-/home/wa_node_modules}"
if [ -f node_modules.tar.gz ] && [ ! -d "$WA_NM/@whiskeysockets" ]; then
  echo "[wa-start] Expanding node_modules.tar.gz → $WA_NM (bir martalik)..."
  mkdir -p "$WA_NM"
  tar -xzf node_modules.tar.gz -C "$WA_NM"
  echo "[wa-start] Expand complete"
fi
if [ -d "$WA_NM/@whiskeysockets" ]; then
  rm -rf node_modules _del_node_modules || true
  ln -sfn "$WA_NM" node_modules
fi

exec node dist/index.js
