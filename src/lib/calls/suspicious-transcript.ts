import type { CallAnalysis } from "./analyze-transcript";

/** Whisper hallucination / past audio sifati uchun qat'iy xulosa matni. */
export const UNCLEAR_SUMMARY =
  "Audio sifati past, aniq transkripsiya qilib bo'lmadi";

/** Transkriptdagi so'zlarni sanash (Mijoz/Xodim yorliqlarisiz). */
export function countTranscriptWords(transcript: string): number {
  const text = transcript
    .replace(/^(Mijoz|Xodim)\s*:\s*/gim, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Whisper hallucination / bo'sh nonsense aniqlash.
 * - so'z soni < 3 va duration > 5s → suspicious
 * - uzoq audio uchun juda qisqa nonsense ham flag
 */
export function isSuspiciousTranscript(
  transcript: string,
  durationSeconds?: number | null
): boolean {
  const wordCount = countTranscriptWords(transcript);
  const duration =
    durationSeconds != null && Number.isFinite(durationSeconds)
      ? Math.max(0, Math.floor(durationSeconds))
      : null;

  if (wordCount < 3 && duration != null && duration > 5) return true;
  if (duration != null && duration > 15 && wordCount < 5) return true;
  if (duration != null && duration > 30 && wordCount < 8) return true;
  if (duration != null && duration > 60 && wordCount < 12) return true;

  return false;
}

/** AI chaqirmasdan "unclear" tahlil yozuvi. */
export function unclearAnalysis(partial?: Partial<CallAnalysis>): CallAnalysis {
  return {
    employeeName: partial?.employeeName ?? null,
    customerName: null,
    customerIntent: null,
    carModel: null,
    carColor: null,
    carBrand: null,
    carTransmission: null,
    budget: null,
    outcome: "unclear",
    reasonPurchased: null,
    reasonNotPurchased: null,
    leadSource: null,
    summary: UNCLEAR_SUMMARY,
    sentiment: null,
    followUpNeeded: false,
    followUpNote: null,
  };
}

/** Suspicious yoki AI unclear holatini yakuniy natijaga majburlash. */
export function enforceUnclearIfNeeded(
  analysis: CallAnalysis,
  suspicious: boolean
): CallAnalysis {
  const summaryLooksUnclear =
    analysis.summary?.trim() === UNCLEAR_SUMMARY ||
    analysis.outcome === "unclear";

  if (!suspicious && !summaryLooksUnclear) return analysis;

  return unclearAnalysis({
    employeeName: analysis.employeeName,
  });
}
