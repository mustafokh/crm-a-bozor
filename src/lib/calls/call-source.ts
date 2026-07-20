import { UNCLEAR_SUMMARY } from "./suspicious-transcript";

export const MESSAGING_SOURCES = new Set(["whatsapp", "telegram"]);

export type CallSourceProbe = {
  source?: string | null;
  fileName?: string | null;
  rawTranscript?: string | null;
  formattedTranscript?: string | null;
  audioUrl?: string | null;
  leadSource?: string | null;
  summary?: string | null;
  outcome?: string | null;
};

function hasCallAudio(call: CallSourceProbe): boolean {
  if (call.audioUrl?.trim()) return true;
  const fn = call.fileName?.trim() ?? "";
  return /^https?:\/\//i.test(fn) || /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(fn);
}

function transcriptText(call: CallSourceProbe): string {
  return (call.formattedTranscript ?? call.rawTranscript ?? "").trim();
}

/** DB dagi source noto'g'ri bo'lsa ham WhatsApp/Telegram ni aniqlash (eski yozuvlar). */
export function resolveEffectiveSource(call: CallSourceProbe): string {
  const stored = call.source?.trim().toLowerCase();
  if (stored && MESSAGING_SOURCES.has(stored)) return stored;

  const fileName = call.fileName?.trim().toLowerCase() ?? "";
  if (fileName.startsWith("wa:")) return "whatsapp";
  if (fileName.startsWith("tg:")) return "telegram";

  const leadSource = call.leadSource?.trim().toLowerCase();
  if (leadSource === "whatsapp") return "whatsapp";
  if (leadSource === "telegram") return "telegram";

  const text = transcriptText(call);
  const labeledDialog = /^(Mijoz|Xodim)\s*:/im.test(text);
  const hasAudio = hasCallAudio(call);

  if (labeledDialog && !hasAudio) {
    return "whatsapp";
  }

  if (
    !hasAudio &&
    (call.summary?.trim() === UNCLEAR_SUMMARY || call.outcome === "unclear") &&
    text.length > 0 &&
    text.length < 4000
  ) {
    return "whatsapp";
  }

  return stored || "call";
}

export function isMessagingSource(source?: string | null): boolean {
  return source != null && MESSAGING_SOURCES.has(source);
}

export function isPhoneCallSource(source?: string | null): boolean {
  return !source || source === "call";
}
