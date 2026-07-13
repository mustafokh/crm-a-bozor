#!/bin/sh
set -e

cd "$(dirname "$0")"

echo ">> Azure: PostgreSQL sxemasi..."
./node_modules/.bin/prisma db push --skip-generate

echo ">> Azure: Next.js standalone ishga tushmoqda..."
exec node server.js
