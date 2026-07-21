import { prisma } from "@/lib/prisma";
import { buildCarInterest } from "@/lib/lead-helpers";
import { checkTopicContinuation } from "./check-topic-continuation";

const HOURS_NEW_INTERACTION = 24;

/** Yakuniy outcome — yangi murojaat ochiladi */
const FINAL_CALL_OUTCOMES = new Set([
  "purchased",
  "not_purchased",
]);

const FINAL_LEAD_OUTCOMES = new Set([
  "BOUGHT",
  "NOT_INTERESTED",
]);

export type InteractionResolution = {
  interactionId: string;
  isNew: boolean;
  reason?: string;
};

function isFinalOutcome(outcome: string | null | undefined): boolean {
  if (!outcome) return false;
  const o = outcome.trim();
  return FINAL_CALL_OUTCOMES.has(o) || FINAL_LEAD_OUTCOMES.has(o);
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

/** Mavjud call'larni bitta interaction ga bog'lash (migratsiya). */
async function backfillOrphanCalls(params: {
  leadId: string;
  source: string;
}): Promise<string | null> {
  const orphans = await prisma.call.findMany({
    where: {
      leadId: params.leadId,
      source: params.source,
      interactionId: null,
      filteredOut: false,
    },
    orderBy: [{ callDate: "asc" }, { createdAt: "asc" }],
    select: { id: true, callDate: true },
  });

  if (orphans.length === 0) return null;

  const first = orphans[0]!;
  const last = orphans[orphans.length - 1]!;

  const interaction = await prisma.interaction.create({
    data: {
      leadId: params.leadId,
      source: params.source,
      startedAt: first.callDate,
      lastMessageAt: last.callDate,
      status: "active",
    },
    select: { id: true },
  });

  await prisma.call.updateMany({
    where: { id: { in: orphans.map((c) => c.id) } },
    data: { interactionId: interaction.id },
  });

  return interaction.id;
}

/**
 * Yangi xabar uchun interaction aniqlash: davom ettirish yoki yangi thread.
 * Lead allaqachon mavjud bo'lishi kerak (yoki null — keyin yaratiladi).
 */
export async function resolveInteraction(params: {
  leadId: string | null;
  phone: string;
  source: string;
  callDate: Date;
  newMessage: string;
}): Promise<InteractionResolution | null> {
  if (!params.leadId) {
    return null;
  }

  let latest = await prisma.interaction.findFirst({
    where: { leadId: params.leadId, source: params.source },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!latest) {
    const backfilled = await backfillOrphanCalls({
      leadId: params.leadId,
      source: params.source,
    });
    if (backfilled) {
      latest = await prisma.interaction.findUnique({ where: { id: backfilled } });
    }
  }

  if (!latest) {
    const created = await prisma.interaction.create({
      data: {
        leadId: params.leadId,
        source: params.source,
        startedAt: params.callDate,
        lastMessageAt: params.callDate,
        status: "active",
      },
      select: { id: true },
    });
    return { interactionId: created.id, isNew: true, reason: "birinchi_murojaat" };
  }

  const gapHours = hoursBetween(latest.lastMessageAt, params.callDate);
  if (gapHours > HOURS_NEW_INTERACTION) {
    await prisma.interaction.update({
      where: { id: latest.id },
      data: { status: "closed", closedAt: latest.lastMessageAt },
    });
    const created = await prisma.interaction.create({
      data: {
        leadId: params.leadId,
        source: params.source,
        startedAt: params.callDate,
        lastMessageAt: params.callDate,
        status: "active",
      },
      select: { id: true },
    });
    return {
      interactionId: created.id,
      isNew: true,
      reason: `vaqt_oraligi_${Math.round(gapHours)}soat`,
    };
  }

  if (isFinalOutcome(latest.outcome)) {
    await prisma.interaction.update({
      where: { id: latest.id },
      data: { status: "closed", closedAt: latest.lastMessageAt },
    });
    const created = await prisma.interaction.create({
      data: {
        leadId: params.leadId,
        source: params.source,
        startedAt: params.callDate,
        lastMessageAt: params.callDate,
        status: "active",
      },
      select: { id: true },
    });
    return {
      interactionId: created.id,
      isNew: true,
      reason: `yakunlangan_${latest.outcome}`,
    };
  }

  const prevTopic =
    latest.topic ||
    buildCarInterest({
      carMake: latest.carMake,
      carModel: latest.carModel,
      carColor: latest.carColor,
    }) ||
    latest.summary?.slice(0, 80) ||
    "";

  if (prevTopic.trim() && params.newMessage.trim()) {
    const topicCheck = await checkTopicContinuation({
      previousTopic: prevTopic,
      previousCarMake: latest.carMake,
      previousCarModel: latest.carModel,
      newMessage: params.newMessage,
    });

    if (!topicCheck.continues_same_topic) {
      await prisma.interaction.update({
        where: { id: latest.id },
        data: { status: "closed", closedAt: latest.lastMessageAt },
      });
      const created = await prisma.interaction.create({
        data: {
          leadId: params.leadId,
          source: params.source,
          startedAt: params.callDate,
          lastMessageAt: params.callDate,
          status: "active",
        },
        select: { id: true },
      });
      return {
        interactionId: created.id,
        isNew: true,
        reason: `yangi_mavzu: ${topicCheck.reason}`,
      };
    }
  }

  return { interactionId: latest.id, isNew: false };
}

/** Interaction uchun call tarixini olish (thread qurish). */
export async function getInteractionCallRecords(interactionId: string) {
  return prisma.call.findMany({
    where: { interactionId },
    orderBy: [{ callDate: "asc" }, { createdAt: "asc" }],
    select: { rawTranscript: true, formattedTranscript: true },
  });
}
