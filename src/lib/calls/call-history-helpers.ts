import type { CallHistoryItem } from "./latest-call";
import { extractMessageText } from "./analyze-messaging";
import {
  isMessagingSource,
  isPhoneCallSource,
  resolveEffectiveSource,
} from "./call-source";
import { UNCLEAR_SUMMARY } from "./suspicious-transcript";

export {
  isMessagingSource,
  isPhoneCallSource,
  MESSAGING_SOURCES,
  resolveEffectiveSource,
} from "./call-source";

export function withEffectiveSource<T extends CallHistoryItem>(call: T): T {
  const effective = resolveEffectiveSource(call);
  if (effective === call.source) return call;
  return { ...call, source: effective };
}

export function partitionCallHistory(calls: CallHistoryItem[]) {
  const normalized = calls.map(withEffectiveSource);
  const phoneCalls = normalized.filter((c) => isPhoneCallSource(c.source));
  const messages = normalized.filter((c) => isMessagingSource(c.source));
  return { phoneCalls, messages };
}

export function pickLatestPhoneCall(calls: CallHistoryItem[]): CallHistoryItem | null {
  return partitionCallHistory(calls).phoneCalls[0] ?? null;
}

/** UI uchun xabar/qo'ng'iroq xulosasi — audio unclear garbage ni yashiradi. */
export function displayInteractionSummary(call: CallHistoryItem): string {
  const effective = withEffectiveSource(call);
  const summary = effective.summary?.trim();
  const transcript =
    effective.formattedTranscript?.trim() || effective.rawTranscript?.trim() || "";

  if (isMessagingSource(effective.source)) {
    if (!summary || summary === UNCLEAR_SUMMARY) {
      return extractMessageText(transcript) || transcript || "—";
    }
    return summary;
  }

  if (summary && summary !== UNCLEAR_SUMMARY) return summary;
  return transcript.slice(0, 120) || summary || "—";
}

export function shouldShowCallOutcome(call: CallHistoryItem): boolean {
  const source = withEffectiveSource(call).source;
  if (isMessagingSource(source)) return false;
  if (!call.outcome || call.outcome === "unclear") {
    return isPhoneCallSource(source);
  }
  return true;
}

export function shouldShowCarDetails(call: CallHistoryItem): boolean {
  const source = withEffectiveSource(call).source;
  if (isMessagingSource(source)) {
    return Boolean(call.carModel || call.carColor);
  }
  return Boolean(call.carModel || call.carColor || call.employeeName);
}

/** Chat UI uchun transkript matni — unclear summary o'rniga haqiqiy xabar. */
export function messagingDisplayText(call: CallHistoryItem): string | null {
  const effective = withEffectiveSource(call);
  const transcript =
    effective.formattedTranscript?.trim() || effective.rawTranscript?.trim() || "";
  if (transcript) return transcript;
  const summary = effective.summary?.trim();
  if (summary && summary !== UNCLEAR_SUMMARY) return summary;
  return null;
}
