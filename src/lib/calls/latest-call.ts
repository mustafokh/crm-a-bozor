/** Oxirgi bog'langan Call — API va UI uchun umumiy tip/helper. */

export interface LatestCallInfo {
  id: string;
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
    audioUrl: true,
    fileName: true,
    direction: true,
    carTransmission: true,
    rawTranscript: true,
    callDate: true,
    durationSeconds: true,
  },
};

export function pickLatestCall(
  calls?: Array<{
    id: string;
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
  return {
    id: c.id,
    audioUrl: c.audioUrl ?? null,
    fileName: c.fileName ?? null,
    direction: c.direction ?? null,
    carTransmission: c.carTransmission ?? null,
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
