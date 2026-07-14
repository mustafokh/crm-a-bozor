import { parsePhoneNumberFromString } from "libphonenumber-js";

/** Normalize phone to E.164-ish (+XXXXXXXX…) */
export function normalizePhone(phone: string): string {
  const raw = phone.trim();
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, "");

  // Oʻzbekiston lokal 9 raqam
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith("998") && digits.length === 12) return `+${digits}`;

  try {
    const candidate = raw.startsWith("+") ? raw : `+${digits}`;
    const parsed = parsePhoneNumberFromString(candidate);
    if (parsed) return parsed.format("E.164");
  } catch {
    /* ignore */
  }

  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return raw;
}
