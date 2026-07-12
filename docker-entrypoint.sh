#!/bin/sh
set -e

echo ">> Docker: PostgreSQL sxemasi..."
npx prisma db push --skip-generate

if [ "$SEED_DB" = "true" ]; then
  echo ">> Docker: seed yuklanmoqda..."
  npx tsx prisma/seed.ts
fi

echo ">> Docker: MKUS CRM ishga tushmoqda..."
exec node server.js
