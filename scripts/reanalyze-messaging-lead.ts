/**
 * WhatsApp/Telegram lead uchun saqlangan call yozuvlaridan to'liq thread tahlilini qayta ishga tushiradi.
 *
 * Usage:
 *   DATABASE_URL=... OPENAI_API_KEY=... npx tsx scripts/reanalyze-messaging-lead.ts +998953330135
 *   DATABASE_URL=... OPENAI_API_KEY=... npx tsx scripts/reanalyze-messaging-lead.ts +998953330135 whatsapp
 */
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../src/lib/phone";
import { analyzeMessagingTranscript } from "../src/lib/calls/analyze-messaging";
import { inferTransmissionFromText } from "../src/lib/calls/latest-call";
import { buildThreadFromCallRecords } from "../src/lib/calls/messaging-thread";
import { syncCallToLead } from "../src/lib/calls/sync-lead";

const MESSAGING_SOURCES = new Set(["whatsapp", "telegram"]);

async function main() {
  const phoneArg = process.argv[2];
  const sourceArg = (process.argv[3] || "whatsapp").trim().toLowerCase();

  if (!phoneArg) {
    console.error("Usage: npx tsx scripts/reanalyze-messaging-lead.ts <phone> [whatsapp|telegram]");
    process.exit(1);
  }
  if (!MESSAGING_SOURCES.has(sourceArg)) {
    console.error("Source must be whatsapp or telegram");
    process.exit(1);
  }

  const phone = normalizePhone(phoneArg);
  const prisma = new PrismaClient();

  const calls = await prisma.call.findMany({
    where: { phone, source: sourceArg },
    orderBy: [{ callDate: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      callDate: true,
      country: true,
      rawTranscript: true,
      formattedTranscript: true,
      employeeName: true,
    },
  });

  if (calls.length === 0) {
    console.error(`No ${sourceArg} calls found for ${phone}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  const threadText = buildThreadFromCallRecords(calls);
  const latest = calls[calls.length - 1]!;
  const latestLine =
    latest.formattedTranscript?.trim() || latest.rawTranscript.trim();
  const employeeName = latest.employeeName?.trim() || undefined;

  console.log(`Re-analyzing ${calls.length} ${sourceArg} message(s) for ${phone}`);
  console.log("--- thread ---");
  console.log(threadText);
  console.log("--- end thread ---");

  let analysis = await analyzeMessagingTranscript(threadText, latestLine, employeeName);
  if (analysis.outcome !== "unclear" && !analysis.carTransmission) {
    analysis = {
      ...analysis,
      carTransmission: inferTransmissionFromText(threadText),
    };
  }

  const analysisFields = {
    employeeName: analysis.employeeName,
    customerName: analysis.customerName,
    customerIntent: analysis.customerIntent,
    carModel: analysis.carModel,
    carColor: analysis.carColor,
    carBrand: analysis.carBrand,
    carTransmission: analysis.carTransmission,
    outcome: analysis.outcome,
    reasonPurchased: analysis.reasonPurchased,
    reasonNotPurchased: analysis.reasonNotPurchased,
    leadSource: analysis.leadSource,
    summary: analysis.summary,
    sentiment: analysis.sentiment,
    followUpNeeded: analysis.followUpNeeded,
    followUpNote: analysis.followUpNote,
  };

  await prisma.call.update({
    where: { id: latest.id },
    data: analysisFields,
  });

  const lead = await syncCallToLead({
    phone,
    country: latest.country,
    callDate: latest.callDate,
    channelSource: sourceArg,
    analysis,
    rawTranscript: latest.rawTranscript,
    callId: latest.id,
  });

  console.log("\nAnalysis result:");
  console.log(JSON.stringify(analysis, null, 2));
  console.log("\nLead updated:", lead.id, lead.fullName);
  console.log("  carInterest:", lead.carInterest);
  console.log("  budget:", lead.budget);
  console.log("  outcome:", lead.outcome);
  console.log("  discussionNotes:", lead.discussionNotes);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
