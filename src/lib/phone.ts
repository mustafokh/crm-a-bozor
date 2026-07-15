import { parsePhoneNumberFromString } from "libphonenumber-js";

function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function looksLikeDateDigits(digits: string): boolean {
  if (!/^\d{8}$/.test(digits)) return false;
  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  return y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
}

/** Matndan + va raqamlarni qaytaradi; telefon emas bo‘lsa null */
function toPhoneDigits(value: string): string | null {
  const chunk = value.trim();
  if (/\d{4}-\d{2}-\d{2}/.test(chunk)) return null;

  const digits = chunk.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (looksLikeDateDigits(digits)) return null;

  const hadPlus = chunk.includes("+");
  return hadPlus || digits.length > 9 ? `+${digits}` : digits;
}

/**
 * Fayl nomi yoki metadata ichidagi telefonni ajratadi.
 * Masalan: "998 95 333 01 35 (phone) 2026-07-14 17-19-12.m4a" → "+998953330135"
 * Topilmasa xom matn qaytariladi.
 */
export function extractPhoneFromText(raw: string): string {
  const text = raw.trim();
  if (!text) return text;

  const tryPart = (part: string): string | null => toPhoneDigits(part);

  // "998 ... (phone) 2026-07-14 ...m4a"
  const phoneTag = text.search(/\s*\(phone\)/i);
  if (phoneTag > 0) {
    const found = tryPart(text.slice(0, phoneTag));
    if (found) return found;
  }

  // "... 2026-07-14 17-19-12.m4a" yoki "... 2026-07-14.m4a"
  const beforeFileDate = text.match(
    /^(.+?)\s+\d{4}-\d{2}-\d{2}(?:[\s\-]\d{2}-\d{2}-\d{2})?\.[a-z0-9]{2,5}$/i
  );
  if (beforeFileDate) {
    const found = tryPart(beforeFileDate[1]);
    if (found) return found;
  }

  // Satr boshidagi telefon (metadata oldin)
  const leading = text.match(/^(\+?\d[\d\s\-().]*\d)(?=\s|$|[;,])/);
  if (leading) {
    const found = tryPart(leading[1]);
    if (found) return found;
  }

  // Satr ichidagi telefon bo‘lagini izlash
  for (const match of text.matchAll(/\+?\d[\d\s\-().]{6,28}\d/g)) {
    const found = tryPart(match[0]);
    if (found) return found;
  }

  return text;
}

function isPhoneToken(value: string): boolean {
  const compact = value.replace(/\s/g, "");
  return /^\+?\d{8,15}$/.test(compact);
}

/** Normalize phone to E.164-ish (+XXXXXXXX…) */
export function normalizePhone(phone: string): string {
  const extracted = extractPhoneFromText(phone.trim());
  if (!extracted) return extracted;

  // Telefon ajratilmagan — xom matn
  if (!isPhoneToken(extracted)) return extracted;

  const digits = extracted.replace(/\D/g, "");

  // Oʻzbekiston lokal 9 raqam
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;

  try {
    const candidate = extracted.startsWith("+") ? extracted : `+${digits}`;
    const parsed = parsePhoneNumberFromString(candidate);
    if (parsed) return parsed.format("E.164");
  } catch {
    /* ignore */
  }

  return `+${digits}`;
}
