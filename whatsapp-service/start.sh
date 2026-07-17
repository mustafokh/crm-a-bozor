#!/bin/sh
# Azure App Service startup — /home is persistent
mkdir -p "${AUTH_DIR:-/home/auth_info}"
exec node dist/index.js
