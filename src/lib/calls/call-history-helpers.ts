import type { CallHistoryItem } from "./latest-call";
import { extractMessageText } from "./analyze-messaging";
import { UNCLEAR_SUMMARY } from "./suspicious-transcript";

export const MESSAGING_SOURCES = new Set(["whatsapp", "telegram"]);

export function isMessagingSource(source?: string | null): boolean {
  return source != null && MESSAGING_SOURCES.has(source);
}

export function isPhoneCallSource(source?: string | null): boolean {
  return !source || source === "call";
}

export function partitionCallHistory(calls: CallHistoryItem[]) {
  const phoneCalls = calls.filter((c) => isPhoneCallSource(c.source));
  const messages = calls.filter((c) => isMessagingSource(c.source));
  return { phoneCalls, messages };
}

export function pickLatestPhoneCall(calls: CallHistoryItem[]): CallHistoryItem | null {
  return partitionCallHistory(calls).phoneCalls[0] ?? null;
}

/** UI uchun xabar/qo'ng'iroq xulosasi — audio unclear garbage ni yashiradi. */
export function displayInteractionSummary(call: CallHistoryItem): string {
  const summary = call.summary?.trim();
  const transcript =
    call.formattedTranscript?.trim() || call.rawTranscript?.trim() || "";

  if (isMessagingSource(call.source)) {
    if (!summary || summary === UNCLEAR_SUMMARY) {
      return extractMessageText(transcript) || transcript || "—";
    }
    return summary;
  }

  if (summary && summary !== UNCLEAR_SUMMARY) return summary;
  return transcript.slice(0, 120) || summary || "—";
}

export function shouldShowCallOutcome(call: CallHistoryItem): boolean {
  if (!call.outcome || call.outcome === "unclear") {
    return isPhoneCallSource(call.source);
  }
  return true;
}

export function shouldShowCarDetails(call: CallHistoryItem): boolean {
  if (isMessagingSource(call.source)) {
    return Boolean(call.carModel || call.carColor);
  }
  return Boolean(call.carModel || call.carColor || call.employeeName);
}
