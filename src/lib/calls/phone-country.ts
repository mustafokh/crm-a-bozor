import { parsePhoneNumberFromString } from "libphonenumber-js";

const ISO_TO_COUNTRY: Record<string, string> = {
  UZ: "O'zbekiston",
  KZ: "Qozog'iston",
  RU: "Rossiya",
  US: "AQSH",
  TR: "Turkiya",
  AE: "BAA",
  DE: "Germaniya",
  KR: "Janubiy Koreya",
  CN: "Xitoy",
  GB: "Buyuk Britaniya",
  IN: "Hindiston",
  TJ: "Tojikiston",
  KG: "Qirg'iziston",
  TM: "Turkmaniston",
};

/** Telefon raqamidan davlat nomini aniqlaydi (libphonenumber-js). */
export function detectCountryFromPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed) return null;

  const iso = parsed.country;
  if (!iso) return null;

  return ISO_TO_COUNTRY[iso] ?? iso;
}
