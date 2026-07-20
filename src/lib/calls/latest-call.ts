/** Oxirgi bog'langan Call — API va UI uchun umumiy tip/helper. */

import { parseDirectionFromFileName, type CallDirection } from "@/lib/calls/call-direction";
import { normalizeTransmission } from "@/lib/calls/analyze-transcript";

export interface LatestCallInfo {
  id: string;
  source?: string | null;
  audioUrl?: string | null;
  fileName?: string | null;
  direction?: string | null;
  carTransmission?: string | null;
  rawTranscript?: string | null;
  formattedTranscript?: string | null;
  callDate?: string | null;
  durationSeconds?: number | null;
  summary?: string | null;
  outcome?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  employeeName?: string | null;
}

/** Lead profilidagi Call tarixi uchun to'liqroq maydonlar. */
export type CallHistoryItem = LatestCallInfo;

const CALL_SELECT = {
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
} as const;

/** Oxirgi N ta Call (tarix + latestCall = calls[0]). */
export const CALLS_HISTORY_INCLUDE = {
  orderBy: { callDate: "desc" as const },
  take: 50,
  select: CALL_SELECT,
};

/** Orqaga moslik: faqat oxirgi call. */
export const LATEST_CALL_INCLUDE = {
  orderBy: { callDate: "desc" as const },
  take: 1,
  select: CALL_SELECT,
};

/** Transkript oxiridagi Mijoz/Xodim qatoridan yo'nalish */
export function inferDirectionFromTranscript(raw?: string | null): CallDirection | null {
  if (!raw?.trim()) return null;
  const lines = raw.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (/^Xodim\s*:/i.test(line)) return "outgoing";
    if (/^Mijoz\s*:/i.test(line)) return "incoming";
  }
  return null;
}

/** Matndan mexanika/avtomat ni oddiy qidiruv bilan topish (AI bo'lmasa ham) */
export function inferTransmissionFromText(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.toLowerCase();
  // Aniqroq patternlar avval
  if (
    /\bmexanik[aа]?\b/i.test(t) ||
    /\bmanual\b/i.test(t) ||
    /\bмеханика\b/i.test(t) ||
    /\bмкпп\b/i.test(t) ||
    /\bmt\b/i.test(t)
  ) {
    return "mexanika";
  }
  if (
    /\bavtomat\b/i.test(t) ||
    /\bautomat/i.test(t) ||
    /\bautomatic\b/i.test(t) ||
    /\bавтомат/i.test(t) ||
    /\bакпп\b/i.test(t) ||
    /\bcvt\b/i.test(t) ||
    /\bat\b/i.test(t)
  ) {
    return "avtomat";
  }
  return normalizeTransmission(raw);
}

export function resolveStoredDirection(params: {
  direction?: string | null;
  fileName?: string | null;
  source?: string | null;
  rawTranscript?: string | null;
  formattedTranscript?: string | null;
}): CallDirection | null {
  if (params.direction === "incoming" || params.direction === "outgoing") {
    return params.direction;
  }
  const fromFile = parseDirectionFromFileName(params.fileName);
  if (fromFile) return fromFile;
  const fromText = inferDirectionFromTranscript(
    params.formattedTranscript || params.rawTranscript
  );
  if (fromText) return fromText;
  if (params.source === "whatsapp" || params.source === "telegram") return "incoming";
  return null;
}

type CallRow = {
  id: string;
  source?: string | null;
  audioUrl?: string | null;
  fileName?: string | null;
  direction?: string | null;
  carTransmission?: string | null;
  rawTranscript?: string | null;
  formattedTranscript?: string | null;
  callDate?: Date | string | null;
  durationSeconds?: number | null;
  summary?: string | null;
  outcome?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  employeeName?: string | null;
};

export function normalizeCallItem(c: CallRow): CallHistoryItem {
  const direction = resolveStoredDirection({
    direction: c.direction,
    fileName: c.fileName,
    source: c.source,
    rawTranscript: c.rawTranscript,
    formattedTranscript: c.formattedTranscript,
  });
  const carTransmission =
    c.carTransmission === "mexanika" || c.carTransmission === "avtomat"
      ? c.carTransmission
      : inferTransmissionFromText(c.formattedTranscript || c.rawTranscript);

  return {
    id: c.id,
    source: c.source ?? null,
    audioUrl: c.audioUrl ?? null,
    fileName: c.fileName ?? null,
    direction,
    carTransmission,
    rawTranscript: c.rawTranscript ?? null,
    formattedTranscript: c.formattedTranscript ?? null,
    callDate: c.callDate ? new Date(c.callDate).toISOString() : null,
    durationSeconds: c.durationSeconds ?? null,
    summary: c.summary ?? null,
    outcome: c.outcome ?? null,
    carModel: c.carModel ?? null,
    carColor: c.carColor ?? null,
    employeeName: c.employeeName ?? null,
  };
}

export function pickLatestCall(
  calls?: CallRow[] | null
): LatestCallInfo | null {
  const c = calls?.[0];
  if (!c) return null;
  return normalizeCallItem(c);
}

export function withLatestCall<T extends { calls?: CallRow[] | null }>(
  lead: T
): Omit<T, "calls"> & {
  calls: CallHistoryItem[];
  latestCall: LatestCallInfo | null;
  latestPhoneCall: LatestCallInfo | null;
} {
  const { calls: rawCalls, ...rest } = lead;
  const calls = (rawCalls ?? []).map(normalizeCallItem);
  const latestPhoneCall =
    calls.find((c) => c.source === "call" || !c.source) ?? null;
  return {
    ...rest,
    calls,
    latestCall: calls[0] ?? null,
    latestPhoneCall,
  };
}

export function resolveCallAudioUrl(call?: LatestCallInfo | null): string | null {
  if (!call) return null;
  if (call.audioUrl) return call.audioUrl;
  if (call.fileName && /^https?:\/\//i.test(call.fileName)) return call.fileName;
  return null;
}
