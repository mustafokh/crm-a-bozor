#!/bin/sh
# Azure App Service startup — /home is persistent
set -e
cd /home/site/wwwroot 2>/dev/null || cd "$(dirname "$0")"

mkdir -p "${AUTH_DIR:-/home/auth_info}"

# Azure sometimes replaces node_modules with an empty dir/symlink and leaves
# node_modules.tar.gz. Expand before starting Node (same pattern as CRM).
if [ -f node_modules.tar.gz ]; then
  need_expand=0
  if [ -L node_modules ]; then
    need_expand=1
  elif [ ! -d node_modules/@whiskeysockets ]; then
    need_expand=1
  fi
  if [ "$need_expand" = "1" ]; then
    echo "[wa-start] Expanding node_modules.tar.gz..."
    rm -rf node_modules _del_node_modules || true
    mkdir -p node_modules
    tar -xzf node_modules.tar.gz -C node_modules
    echo "[wa-start] Expand complete"
  fi
fi

exec node dist/index.js
