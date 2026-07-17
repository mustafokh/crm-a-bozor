/** Call yo'nalishi: incoming (mijoz→biz) | outgoing (biz→mijoz) */

export type CallDirection = "incoming" | "outgoing";

/**
 * Cube ACR fayl nomidan yo'nalish:
 * ↗ / outgoing / out / chiquvchi → outgoing
 * ↙ / incoming / in / kiruvchi → incoming
 */
export function parseDirectionFromFileName(fileName: string | null | undefined): CallDirection | null {
  if (!fileName) return null;
  const name = fileName.trim();
  if (!name) return null;

  if (/[↗⬆↑➞➔➝➟]/i.test(name) || /\boutgoing\b/i.test(name) || /\bout\b/i.test(name) || /chiquvchi/i.test(name)) {
    return "outgoing";
  }
  if (/[↙⬇↓⬅←]/i.test(name) || /\bincoming\b/i.test(name) || /\bin\b/i.test(name) || /kiruvchi/i.test(name)) {
    return "incoming";
  }
  return null;
}

/** POST body + file_name + WhatsApp from_me dan direction aniqlash */
export function resolveCallDirection(params: {
  direction?: unknown;
  from_me?: unknown;
  fileName?: string | null;
  source?: string;
}): CallDirection | null {
  const raw = String(params.direction ?? "").trim().toLowerCase();
  if (raw === "incoming" || raw === "inbound" || raw === "in" || raw === "kiruvchi") {
    return "incoming";
  }
  if (raw === "outgoing" || raw === "outbound" || raw === "out" || raw === "chiquvchi") {
    return "outgoing";
  }

  if (params.from_me === true || params.from_me === "true" || params.from_me === 1) {
    return "outgoing";
  }
  if (params.from_me === false || params.from_me === "false" || params.from_me === 0) {
    return "incoming";
  }

  const fromFile = parseDirectionFromFileName(params.fileName);
  if (fromFile) return fromFile;

  // WhatsApp/Telegram: direction berilmasa, default kiruvchi (mijoz xabari)
  if (params.source === "whatsapp" || params.source === "telegram") {
    return "incoming";
  }

  return null;
}
