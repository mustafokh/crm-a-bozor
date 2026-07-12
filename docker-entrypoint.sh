#!/bin/sh
set -e

echo ">> Prisma: bazani tekshirish..."
node /app/node_modules/prisma/build/index.js db push --skip-generate

if [ "$SEED_DB" = "true" ]; then
  echo ">> Seed: demo ma'lumot yuklanmoqda..."
  node /app/node_modules/tsx/dist/cli.mjs /app/prisma/seed.ts
fi

echo ">> MKUS CRM ishga tushmoqda..."
exec node server.js
