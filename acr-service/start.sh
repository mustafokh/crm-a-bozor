#!/bin/bash
# Azure App Service startup — bind health ASAP, then install deps + run worker.
set -euo pipefail
cd /home/site/wwwroot 2>/dev/null || cd "$(dirname "$0")"
export PYTHONUNBUFFERED=1
export PORT="${PORT:-8080}"
PACKAGES="${PYTHON_PACKAGES_DIR:-/home/site/wwwroot/.python_packages}"

# Stdlib-only health while pip/worker boot (Azure warmup)
python -c "
import os, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        b=b'{\"ok\":true,\"booting\":true,\"service\":\"mkus-acr-worker\"}'
        self.send_response(200); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def log_message(self,*a): pass
ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PORT','8080'))), H).serve_forever()
" &
BOOT_PID=$!
echo "boot health pid=$BOOT_PID port=$PORT"

mkdir -p "$PACKAGES"
if [ ! -f "$PACKAGES/.installed" ]; then
  echo "pip install (first boot)..."
  python -m pip install --upgrade pip -q
  python -m pip install -r requirements.txt -t "$PACKAGES" -q
  date -u >"$PACKAGES/.installed"
  echo "pip done"
else
  echo "deps cached"
fi

# Free port for worker
kill "$BOOT_PID" 2>/dev/null || true
wait "$BOOT_PID" 2>/dev/null || true
sleep 1

export PYTHONPATH="$PACKAGES:${PYTHONPATH:-}"
exec python worker.py
