import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { analyzeMessagingTranscript } from "@/lib/calls/analyze-messaging";
import { analyzeTranscript } from "@/lib/calls/analyze-transcript";
import { buildThreadFromCallRecords } from "@/lib/calls/messaging-thread";
import { formatTranscriptAsDialog, isAlreadyLabeledDialog } from "@/lib/calls/format-transcript";
import { inferTransmissionFromText, CALLS_HISTORY_INCLUDE, withLatestCall } from "@/lib/calls/latest-call";
import { syncCallToLead } from "@/lib/calls/sync-lead";
import { enforceUnclearIfNeeded } from "@/lib/calls/suspicious-transcript";

const MESSAGING_SOURCES = new Set(["whatsapp", "telegram"]);

/** Qo'lda "Bu aslida mijoz" — lidni asosiy ro'yxatga qaytarish va to'liq tahlilni qayta ishga tushirish. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      calls: {
        orderBy: [{ callDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          source: true,
          callDate: true,
          country: true,
          rawTranscript: true,
          formattedTranscript: true,
          employeeName: true,
        },
      },
    },
  });

  if (!lead) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const channelSource =
    lead.source === "WHATSAPP"
      ? "whatsapp"
      : lead.source === "TELEGRAM"
        ? "telegram"
        : "call";

  const relevantCalls = lead.calls.filter((c) => {
    if (MESSAGING_SOURCES.has(channelSource)) return c.source === channelSource;
    return c.source === "call";
  });

  if (relevantCalls.length === 0) {
    await prisma.lead.update({
      where: { id },
      data: { isFiltered: false, manuallyPromoted: true },
    });
    return NextResponse.json({ ok: true, lead: { id, manuallyPromoted: true } });
  }

  const latest = relevantCalls[relevantCalls.length - 1]!;
  const isMessaging = MESSAGING_SOURCES.has(channelSource);
  let transcriptForAnalysis: string;
  let persistedTranscript = latest.rawTranscript;

  if (isMessaging) {
    transcriptForAnalysis = buildThreadFromCallRecords(relevantCalls);
    persistedTranscript = latest.formattedTranscript?.trim() || latest.rawTranscript;
  } else {
    const raw = latest.formattedTranscript?.trim() || latest.rawTranscript;
    if (isAlreadyLabeledDialog(raw)) {
      transcriptForAnalysis = raw;
    } else {
      try {
        transcriptForAnalysis = (await formatTranscriptAsDialog(raw)) ?? raw;
      } catch {
        transcriptForAnalysis = raw;
      }
    }
  }

  const employeeName = latest.employeeName?.trim() || undefined;
  let analysis = isMessaging
    ? await analyzeMessagingTranscript(transcriptForAnalysis, persistedTranscript, employeeName)
    : await analyzeTranscript(transcriptForAnalysis);

  if (!isMessaging) {
    analysis = enforceUnclearIfNeeded(analysis, false);
  }
  if (employeeName) {
    analysis = { ...analysis, employeeName };
  }
  if (analysis.outcome !== "unclear" && !analysis.carTransmission) {
    analysis = {
      ...analysis,
      carTransmission: inferTransmissionFromText(transcriptForAnalysis),
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
    isBusinessRelated: true,
    filteredOut: false,
    businessFilterReason: null,
  };

  await prisma.call.update({
    where: { id: latest.id },
    data: analysisFields,
  });

  await prisma.lead.update({
    where: { id },
    data: { isFiltered: false, manuallyPromoted: true },
  });

  const updatedLead = await syncCallToLead({
    phone: lead.phone,
    country: latest.country ?? lead.country,
    callDate: latest.callDate,
    channelSource,
    analysis,
    rawTranscript: persistedTranscript,
    callId: latest.id,
    clearFiltered: true,
  });

  await logActivity({
    userId: auth.id,
    action: "UPDATE",
    entityType: "Lead",
    entityId: id,
    description: `${auth.name} "${lead.fullName}" lidini qo'lda asosiy ro'yxatga qaytardi`,
  });

  const fullLead = await prisma.lead.findUnique({
    where: { id: updatedLead.id },
    include: {
      assignedTo: { select: { id: true, name: true } },
      conversations: {
        orderBy: { talkedAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
      calls: CALLS_HISTORY_INCLUDE,
      _count: { select: { conversations: true } },
    },
  });

  return NextResponse.json({ ok: true, lead: fullLead ? withLatestCall(fullLead) : updatedLead });
}
