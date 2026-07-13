#!/bin/sh
set -e
cd /home/site/wwwroot 2>/dev/null || cd "$(dirname "$0")"
exec node server.js
