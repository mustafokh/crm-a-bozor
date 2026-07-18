/** WhatsApp/Telegram xabarlarini yorliqlash va AI konteksti uchun birlashtirish. */

export type MessageDirection = "inbound" | "outbound";

export function resolveMessageDirection(body: {
  direction?: unknown;
  from_me?: unknown;
}): MessageDirection {
  const direction = String(body.direction ?? "").trim().toLowerCase();
  if (
    direction === "outbound" ||
    direction === "outgoing" ||
    direction === "out" ||
    direction === "employee" ||
    direction === "chiquvchi"
  ) {
    return "outbound";
  }
  if (
    direction === "inbound" ||
    direction === "incoming" ||
    direction === "in" ||
    direction === "customer" ||
    direction === "kiruvchi"
  ) {
    return "inbound";
  }
  if (body.from_me === true || body.from_me === "true" || body.from_me === 1) {
    return "outbound";
  }
  return "inbound";
}

/** Yangi xabarni "Mijoz: ..." / "Xodim: ..." formatiga keltiradi. */
export function labelMessage(text: string, direction: MessageDirection): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  if (/^(Mijoz|Xodim)\s*:/i.test(trimmed)) return trimmed;
  const speaker = direction === "outbound" ? "Xodim" : "Mijoz";
  return `${speaker}: ${trimmed}`;
}

/** Suhbat matniga yangi qator qo'shadi (takroriy oxirgi qatorni o'tkazib yuboradi). */
export function appendTranscriptLine(existing: string | null | undefined, line: string): string {
  const prev = (existing ?? "").trim();
  const next = line.trim();
  if (!next) return prev;
  if (!prev) return next;

  const lines = prev.split(/\r?\n/);
  if (lines[lines.length - 1]?.trim() === next) return prev;
  return `${prev}\n${next}`;
}

/**
 * Bir nechta eski call yozuvlarining transkriptlarini xronologik birlashtiradi.
 * Har bir yozuv allaqachon ko'p qatorli suhbat bo'lishi mumkin.
 * Eski (yorliqsiz) qatorlarni "Mijoz: ..." deb belgilaydi — ilgari faqat kiruvchi xabarlar yuborilgan.
 */
export function mergeThreadTranscripts(parts: string[]): string {
  let combined = "";
  for (const part of parts) {
    const normalized = normalizeLegacyTranscript(part);
    if (!normalized) continue;
    if (!combined) {
      combined = normalized;
      continue;
    }
    if (combined.includes(normalized)) continue;
    combined = `${combined}\n${normalized}`;
  }
  return combined;
}

function normalizeLegacyTranscript(part: string): string {
  const trimmed = part.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      if (/^(Mijoz|Xodim)\s*:/i.test(t)) return t;
      return `Mijoz: ${t}`;
    })
    .filter(Boolean)
    .join("\n");
}
