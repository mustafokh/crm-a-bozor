import { prisma } from "@/lib/prisma";
import { buildCarInterest } from "@/lib/lead-helpers";
import type { CallAnalysis } from "./analyze-transcript";

const CHANNEL_TO_LEAD: Record<string, string> = {
  call: "CALL",
  whatsapp: "WHATSAPP",
  telegram: "TELEGRAM",
};

const OUTCOME_TO_LEAD: Record<string, string> = {
  purchased: "BOUGHT",
  not_purchased: "NOT_INTERESTED",
  pending: "THINKING",
  callback_needed: "CALLBACK",
};

/** Qo'ng'iroq/WhatsApp/Telegram transkriptini lidga bog'laydi yoki yangi lid yaratadi. */
export async function syncCallToLead(params: {
  phone: string;
  country: string | null;
  callDate: Date;
  channelSource: string;
  analysis: CallAnalysis;
  rawTranscript: string;
  callId: string;
}) {
  const leadSource = CHANNEL_TO_LEAD[params.channelSource] ?? "CALL";
  const outcome = params.analysis.outcome
    ? OUTCOME_TO_LEAD[params.analysis.outcome] ?? null
    : null;

  let assignedToId: string | null = null;
  if (params.analysis.employeeName) {
    const user = await prisma.user.findFirst({
      where: {
        name: { contains: params.analysis.employeeName, mode: "insensitive" },
        active: true,
      },
      select: { id: true },
    });
    assignedToId = user?.id ?? null;
  }

  const talkFields = {
    talkedAt: params.callDate,
    discussionNotes:
      params.analysis.summary ??
      params.rawTranscript.slice(0, 2000),
    carMake: params.analysis.carBrand,
    carModel: params.analysis.carModel,
    carColor: params.analysis.carColor,
    outcome,
    carInterest: buildCarInterest({
      carMake: params.analysis.carBrand,
      carModel: params.analysis.carModel,
      carColor: params.analysis.carColor,
    }),
    clientWants: params.analysis.followUpNote,
  };

  let lead = await prisma.lead.findFirst({
    where: { phone: params.phone },
    orderBy: { updatedAt: "desc" },
  });

  const fullName = params.analysis.customerName?.trim() || "Noma'lum mijoz";

  if (lead) {
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        fullName: params.analysis.customerName?.trim() || lead.fullName,
        country: params.country ?? lead.country,
        source: leadSource,
        ...talkFields,
        assignedToId: assignedToId ?? lead.assignedToId,
        status: lead.status === "CLOSED" ? "ACTIVE" : lead.status,
      },
    });
  } else {
    lead = await prisma.lead.create({
      data: {
        fullName,
        phone: params.phone,
        country: params.country,
        source: leadSource,
        status: "NEW",
        assignedToId,
        ...talkFields,
      },
    });
  }

  const conversationUserId = assignedToId ?? lead.assignedToId;
  if (conversationUserId) {
    await prisma.leadConversation.create({
      data: {
        leadId: lead.id,
        userId: conversationUserId,
        ...talkFields,
      },
    });
  }

  await prisma.call.update({
    where: { id: params.callId },
    data: { leadId: lead.id },
  });

  return lead;
}
