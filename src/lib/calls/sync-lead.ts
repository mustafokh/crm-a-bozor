import { prisma } from "@/lib/prisma";
import { buildCarInterest, normalizeLeadOutcome, stripMakeFromModel } from "@/lib/lead-helpers";
import { extractMessageText } from "@/lib/calls/analyze-messaging";
import { syncInteractionFromAnalysis } from "./sync-interaction";
import type { CallAnalysis } from "./analyze-transcript";

const CHANNEL_TO_LEAD: Record<string, string> = {
  call: "CALL",
  whatsapp: "WHATSAPP",
  telegram: "TELEGRAM",
};

const OUTCOME_TO_LEAD: Record<string, string> = {
  purchased: "BOUGHT",
  not_purchased: "NOT_INTERESTED",
  price_objection: "PRICE_OBJECTION",
  pending: "THINKING",
  callback_needed: "CALLBACK",
  unclear: "UNCLEAR",
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
  clearFiltered?: boolean;
  interactionId?: string | null;
}) {
  const leadSource = CHANNEL_TO_LEAD[params.channelSource] ?? "CALL";
  const isMessaging =
    params.channelSource === "whatsapp" || params.channelSource === "telegram";
  const outcome = params.analysis.outcome
    ? normalizeLeadOutcome(OUTCOME_TO_LEAD[params.analysis.outcome] ?? params.analysis.outcome)
    : null;
  const discussionNotes = isMessaging
    ? params.analysis.summary?.trim() ||
      extractMessageText(params.rawTranscript) ||
      params.rawTranscript.slice(0, 2000)
    : params.analysis.summary ?? params.rawTranscript.slice(0, 2000);

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

  const carMake = params.analysis.carBrand?.trim() || null;
  const carModelRaw = params.analysis.carModel?.trim() || null;
  const carModel = carModelRaw ? stripMakeFromModel(carMake, carModelRaw) || null : null;

  const talkFields = {
    talkedAt: params.callDate,
    discussionNotes,
    carMake,
    carModel,
    carColor: params.analysis.carColor,
    budget: params.analysis.budget,
    outcome,
    carInterest: buildCarInterest({
      carMake,
      carModel,
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
    // Unclear tahlil oldingi yaxshi outcome/nomni o'chirmasin
    const isUnclear = params.analysis.outcome === "unclear";
    const unfilter = params.clearFiltered && !lead.manuallyPromoted;
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        fullName: isUnclear
          ? lead.fullName
          : params.analysis.customerName?.trim() || lead.fullName,
        country: params.country ?? lead.country,
        source: leadSource,
        talkedAt: talkFields.talkedAt,
        discussionNotes: talkFields.discussionNotes,
        ...(unfilter ? { isFiltered: false } : {}),
        ...(isUnclear
          ? {}
          : {
              carMake: talkFields.carMake,
              carModel: talkFields.carModel,
              carColor: talkFields.carColor,
              budget: talkFields.budget,
              outcome: talkFields.outcome,
              carInterest: talkFields.carInterest,
              clientWants: talkFields.clientWants,
            }),
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
        isFiltered: false,
        ...talkFields,
      },
    });
  }

  const conversationUserId = assignedToId ?? lead.assignedToId;
  // WhatsApp/Telegram xabarlari alohida messages bo'limida — takroriy gaplashuv yaratmaymiz
  if (conversationUserId && !isMessaging) {
    await prisma.leadConversation.create({
      data: {
        leadId: lead.id,
        userId: conversationUserId,
        ...talkFields,
      },
    });
  }

  // Production DB'da audio_url ustuni hali bo'lmasligi mumkin:
  // prisma.call.update() esa RETURNING bilan audio_url-ni ham so'rashi mumkin.
  // Shuning uchun leadId'ni raw SQL bilan yangilaymiz.
  await prisma.$executeRaw`
    UPDATE calls
    SET lead_id = ${lead.id}
    WHERE id = ${params.callId};
  `;

  if (params.interactionId) {
    await syncInteractionFromAnalysis({
      interactionId: params.interactionId,
      callDate: params.callDate,
      analysis: params.analysis,
      employeeName: params.analysis.employeeName,
    });
  }

  return lead;
}

/** Biznesga aloqasi yo'q suhbat — lidni yashirish yoki minimal yozuv yaratish. */
export async function syncFilteredCall(params: {
  phone: string;
  country: string | null;
  callDate: Date;
  channelSource: string;
  rawTranscript: string;
  callId: string;
  filterReason: string;
  employeeName?: string | null;
}) {
  const leadSource = CHANNEL_TO_LEAD[params.channelSource] ?? "CALL";
  const isMessaging =
    params.channelSource === "whatsapp" || params.channelSource === "telegram";
  const discussionNotes = isMessaging
    ? extractMessageText(params.rawTranscript) || params.rawTranscript.slice(0, 500)
    : params.rawTranscript.slice(0, 500);

  let assignedToId: string | null = null;
  if (params.employeeName) {
    const user = await prisma.user.findFirst({
      where: {
        name: { contains: params.employeeName, mode: "insensitive" },
        active: true,
      },
      select: { id: true },
    });
    assignedToId = user?.id ?? null;
  }

  let lead = await prisma.lead.findFirst({
    where: { phone: params.phone },
    orderBy: { updatedAt: "desc" },
  });

  if (lead) {
    if (lead.manuallyPromoted) {
      await prisma.$executeRaw`
        UPDATE calls SET lead_id = ${lead.id} WHERE id = ${params.callId};
      `;
      return lead;
    }
    lead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        isFiltered: true,
        talkedAt: params.callDate,
        discussionNotes: params.filterReason,
        source: leadSource,
        assignedToId: assignedToId ?? lead.assignedToId,
      },
    });
  } else {
    lead = await prisma.lead.create({
      data: {
        fullName: "Noma'lum mijoz",
        phone: params.phone,
        country: params.country,
        source: leadSource,
        status: "NEW",
        isFiltered: true,
        talkedAt: params.callDate,
        discussionNotes: params.filterReason,
        assignedToId,
      },
    });
  }

  await prisma.$executeRaw`
    UPDATE calls SET lead_id = ${lead.id} WHERE id = ${params.callId};
  `;

  return lead;
}
