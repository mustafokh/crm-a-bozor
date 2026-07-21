import { prisma } from "@/lib/prisma";
import { buildCarInterest, normalizeLeadOutcome, stripMakeFromModel } from "@/lib/lead-helpers";
import type { CallAnalysis } from "./analyze-transcript";

const OUTCOME_TO_LEAD: Record<string, string> = {
  purchased: "BOUGHT",
  not_purchased: "NOT_INTERESTED",
  price_objection: "PRICE_OBJECTION",
  pending: "THINKING",
  callback_needed: "CALLBACK",
  unclear: "UNCLEAR",
};

/** Interaction yozuvini AI tahlil natijasidan yangilash. */
export async function syncInteractionFromAnalysis(params: {
  interactionId: string;
  callDate: Date;
  analysis: CallAnalysis;
  employeeName?: string | null;
}) {
  const carMake = params.analysis.carBrand?.trim() || null;
  const carModelRaw = params.analysis.carModel?.trim() || null;
  const carModel = carModelRaw ? stripMakeFromModel(carMake, carModelRaw) || null : null;
  const carInterest = buildCarInterest({
    carMake,
    carModel,
    carColor: params.analysis.carColor,
  });
  const topic = carInterest || params.analysis.carModel?.trim() || params.analysis.summary?.slice(0, 80) || null;
  const outcome = params.analysis.outcome
    ? normalizeLeadOutcome(OUTCOME_TO_LEAD[params.analysis.outcome] ?? params.analysis.outcome)
    : null;

  const isFinal =
    params.analysis.outcome === "purchased" || params.analysis.outcome === "not_purchased";

  await prisma.interaction.update({
    where: { id: params.interactionId },
    data: {
      lastMessageAt: params.callDate,
      topic,
      carMake,
      carModel,
      carColor: params.analysis.carColor,
      carInterest,
      carTransmission: params.analysis.carTransmission,
      budget: params.analysis.budget,
      outcome,
      summary: params.analysis.summary,
      customerName: params.analysis.customerName,
      employeeName: params.employeeName ?? params.analysis.employeeName,
      ...(isFinal ? { status: "closed", closedAt: params.callDate } : {}),
    },
  });
}
