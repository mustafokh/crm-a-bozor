/**
 * Eski call yozuvlarida direction / car_transmission ni to'ldirish.
 * Usage: DATABASE_URL=... npx tsx scripts/backfill-call-fields.ts
 */
import { PrismaClient } from "@prisma/client";
import {
  inferTransmissionFromText,
  resolveStoredDirection,
} from "../src/lib/calls/latest-call";

async function main() {
  const prisma = new PrismaClient();
  const calls = await prisma.call.findMany({
    select: {
      id: true,
      source: true,
      fileName: true,
      direction: true,
      carTransmission: true,
      rawTranscript: true,
    },
  });

  let dirUpdated = 0;
  let txUpdated = 0;

  for (const c of calls) {
    const direction = resolveStoredDirection({
      direction: c.direction,
      fileName: c.fileName,
      source: c.source,
      rawTranscript: c.rawTranscript,
    });
    const carTransmission =
      c.carTransmission === "mexanika" || c.carTransmission === "avtomat"
        ? c.carTransmission
        : inferTransmissionFromText(c.rawTranscript);

    const data: { direction?: string; carTransmission?: string } = {};
    if (!c.direction && direction) {
      data.direction = direction;
      dirUpdated++;
    }
    if (!c.carTransmission && carTransmission) {
      data.carTransmission = carTransmission;
      txUpdated++;
    }
    if (Object.keys(data).length > 0) {
      await prisma.call.update({ where: { id: c.id }, data });
    }
  }

  console.log(`Done. direction filled=${dirUpdated}, transmission filled=${txUpdated}, total=${calls.length}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
