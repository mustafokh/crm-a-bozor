#!/bin/sh
set -e

echo ">> Prisma: bazani tekshirish..."
npx prisma db push --skip-generate

if [ "$SEED_DB" = "true" ]; then
  echo ">> Seed: demo ma'lumot yuklanmoqda..."
  npx tsx prisma/seed.ts
fi

echo ">> MKUS CRM ishga tushmoqda..."
exec node server.js
