#!/bin/sh
# Azure App Service startup — /home is persistent
set -e
cd /home/site/wwwroot 2>/dev/null || cd "$(dirname "$0")"

mkdir -p "${AUTH_DIR:-/home/auth_info}"

TG_NM="${TG_NODE_MODULES:-/home/tg_node_modules}"
if [ -f node_modules.tar.gz ] && [ ! -d "$TG_NM/telegram" ]; then
  echo "[tg-start] Expanding node_modules.tar.gz → $TG_NM (bir martalik)..."
  mkdir -p "$TG_NM"
  tar -xzf node_modules.tar.gz -C "$TG_NM"
  echo "[tg-start] Expand complete"
fi
if [ -d "$TG_NM/telegram" ]; then
  rm -rf node_modules _del_node_modules || true
  ln -sfn "$TG_NM" node_modules
fi

exec node dist/index.js
