import { prisma } from "@/lib/prisma";
import { buildCarInterest } from "@/lib/lead-helpers";
import { extractMessageText } from "@/lib/calls/analyze-messaging";
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
}) {
  const leadSource = CHANNEL_TO_LEAD[params.channelSource] ?? "CALL";
  const isMessaging =
    params.channelSource === "whatsapp" || params.channelSource === "telegram";
  const outcome = params.analysis.outcome
    ? OUTCOME_TO_LEAD[params.analysis.outcome] ?? null
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

  const talkFields = {
    talkedAt: params.callDate,
    discussionNotes,
    carMake: params.analysis.carBrand,
    carModel: params.analysis.carModel,
    carColor: params.analysis.carColor,
    budget: params.analysis.budget,
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
    // Unclear tahlil oldingi yaxshi outcome/nomni o'chirmasin
    const isUnclear = params.analysis.outcome === "unclear";
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

  return lead;
}
