#!/bin/sh
set -e
cd /home/site/wwwroot 2>/dev/null || cd "$(dirname "$0")"

# Azure sometimes replaces node_modules with a symlink to empty /node_modules
# and leaves node_modules.tar.gz. Expand it before starting Node.
if [ -f node_modules.tar.gz ]; then
  if [ -L node_modules ] || [ ! -d node_modules/.prisma/client ]; then
    echo "[azure-start] Expanding node_modules.tar.gz..."
    # Directories must use rm -rf; rm -f fails under set -e
    rm -rf node_modules _del_node_modules || true
    mkdir -p node_modules
    tar -xzf node_modules.tar.gz -C node_modules
    echo "[azure-start] Expand complete"
  fi
fi

exec node server.js
