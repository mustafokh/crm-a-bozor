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
  callDate?: string | null;
  durationSeconds?: number | null;
}

export const LATEST_CALL_INCLUDE = {
  orderBy: { callDate: "desc" as const },
  take: 1,
  select: {
    id: true,
    source: true,
    audioUrl: true,
    fileName: true,
    direction: true,
    carTransmission: true,
    rawTranscript: true,
    callDate: true,
    durationSeconds: true,
  },
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
}): CallDirection | null {
  if (params.direction === "incoming" || params.direction === "outgoing") {
    return params.direction;
  }
  const fromFile = parseDirectionFromFileName(params.fileName);
  if (fromFile) return fromFile;
  const fromText = inferDirectionFromTranscript(params.rawTranscript);
  if (fromText) return fromText;
  if (params.source === "whatsapp" || params.source === "telegram") return "incoming";
  return null;
}

export function pickLatestCall(
  calls?: Array<{
    id: string;
    source?: string | null;
    audioUrl?: string | null;
    fileName?: string | null;
    direction?: string | null;
    carTransmission?: string | null;
    rawTranscript?: string | null;
    callDate?: Date | string | null;
    durationSeconds?: number | null;
  }> | null
): LatestCallInfo | null {
  const c = calls?.[0];
  if (!c) return null;

  const direction = resolveStoredDirection({
    direction: c.direction,
    fileName: c.fileName,
    source: c.source,
    rawTranscript: c.rawTranscript,
  });
  const carTransmission =
    c.carTransmission === "mexanika" || c.carTransmission === "avtomat"
      ? c.carTransmission
      : inferTransmissionFromText(c.rawTranscript);

  return {
    id: c.id,
    source: c.source ?? null,
    audioUrl: c.audioUrl ?? null,
    fileName: c.fileName ?? null,
    direction,
    carTransmission,
    rawTranscript: c.rawTranscript ?? null,
    callDate: c.callDate ? new Date(c.callDate).toISOString() : null,
    durationSeconds: c.durationSeconds ?? null,
  };
}

export function withLatestCall<T extends { calls?: Parameters<typeof pickLatestCall>[0] }>(
  lead: T
): Omit<T, "calls"> & { latestCall: LatestCallInfo | null } {
  const { calls, ...rest } = lead;
  return { ...rest, latestCall: pickLatestCall(calls) };
}

export function resolveCallAudioUrl(call?: LatestCallInfo | null): string | null {
  if (!call) return null;
  if (call.audioUrl) return call.audioUrl;
  if (call.fileName && /^https?:\/\//i.test(call.fileName)) return call.fileName;
  return null;
}
