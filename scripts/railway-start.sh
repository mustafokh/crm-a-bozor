#!/bin/sh
set -e

echo ">> Railway: PostgreSQL sxemasi..."
./node_modules/.bin/prisma db push --skip-generate

echo ">> Railway: Next.js ishga tushmoqda..."
exec ./node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
