#!/bin/sh
set -e
cd /home/site/wwwroot 2>/dev/null || cd "$(dirname "$0")"

# Azure sometimes replaces node_modules with a symlink to empty /node_modules
# and leaves node_modules.tar.gz. Expand it before starting Node.
if [ -f node_modules.tar.gz ]; then
  if [ -L node_modules ] || [ ! -d node_modules/.prisma/client ]; then
    echo "[azure-start] Expanding node_modules.tar.gz..."
    rm -f node_modules _del_node_modules
    mkdir -p node_modules
    tar -xzf node_modules.tar.gz -C node_modules
  fi
fi

exec node server.js
