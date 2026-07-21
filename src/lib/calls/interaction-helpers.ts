/** Interaction (thread) — API va UI uchun helperlar. */

import { normalizeCallItem, type CallHistoryItem } from "./latest-call";
import { normalizeLeadOutcome, leadOutcomeLabel } from "@/lib/lead-helpers";

export type InteractionRow = {
  id: string;
  source: string;
  status: string;
  startedAt: Date | string;
  lastMessageAt: Date | string;
  closedAt?: Date | string | null;
  topic?: string | null;
  carMake?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carInterest?: string | null;
  carTransmission?: string | null;
  budget?: string | null;
  outcome?: string | null;
  summary?: string | null;
  customerName?: string | null;
  employeeName?: string | null;
  calls?: Parameters<typeof normalizeCallItem>[0][];
};

export type InteractionInfo = {
  id: string;
  source: string;
  status: string;
  startedAt: string;
  lastMessageAt: string;
  closedAt: string | null;
  topic: string | null;
  carInterest: string | null;
  outcome: string | null;
  summary: string | null;
  calls: CallHistoryItem[];
};

export const INTERACTIONS_INCLUDE = {
  orderBy: { lastMessageAt: "desc" as const },
  take: 30,
  include: {
    calls: {
      orderBy: { callDate: "desc" as const },
      take: 50,
      select: {
        id: true,
        source: true,
        audioUrl: true,
        fileName: true,
        direction: true,
        carTransmission: true,
        rawTranscript: true,
        formattedTranscript: true,
        callDate: true,
        durationSeconds: true,
        summary: true,
        outcome: true,
        carModel: true,
        carColor: true,
        employeeName: true,
        leadSource: true,
      },
    },
  },
};

export function normalizeInteraction(ix: InteractionRow): InteractionInfo {
  const topic =
    ix.topic?.trim() ||
    ix.carInterest?.trim() ||
    [ix.carMake, ix.carModel].filter(Boolean).join(" ") ||
    null;

  return {
    id: ix.id,
    source: ix.source,
    status: ix.status,
    startedAt: new Date(ix.startedAt).toISOString(),
    lastMessageAt: new Date(ix.lastMessageAt).toISOString(),
    closedAt: ix.closedAt ? new Date(ix.closedAt).toISOString() : null,
    topic,
    carInterest: ix.carInterest ?? topic,
    outcome: ix.outcome ? normalizeLeadOutcome(ix.outcome) : null,
    summary: ix.summary ?? null,
    calls: (ix.calls ?? []).map(normalizeCallItem),
  };
}

export function interactionTopicLabel(ix: InteractionInfo): string {
  return ix.topic || ix.carInterest || "—";
}

export function interactionOutcomeLabel(
  t: (key: string) => string,
  outcome: string | null
): string {
  if (!outcome) return "—";
  return leadOutcomeLabel(t, outcome);
}
