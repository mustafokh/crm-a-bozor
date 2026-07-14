import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface CountryInfo {
  name: string;
  iso: string;
  flag: string;
  dial: string;
}

const ISO_META: Record<string, { name: string; flag: string; dial: string }> = {
  UZ: { name: "Uzbekistan", flag: "🇺🇿", dial: "+998" },
  KZ: { name: "Kazakhstan", flag: "🇰🇿", dial: "+7" },
  RU: { name: "Russia", flag: "🇷🇺", dial: "+7" },
  AE: { name: "UAE", flag: "🇦🇪", dial: "+971" },
  US: { name: "USA", flag: "🇺🇸", dial: "+1" },
  TR: { name: "Turkey", flag: "🇹🇷", dial: "+90" },
  DE: { name: "Germany", flag: "🇩🇪", dial: "+49" },
  KR: { name: "South Korea", flag: "🇰🇷", dial: "+82" },
  CN: { name: "China", flag: "🇨🇳", dial: "+86" },
  GB: { name: "United Kingdom", flag: "🇬🇧", dial: "+44" },
  IN: { name: "India", flag: "🇮🇳", dial: "+91" },
  TJ: { name: "Tajikistan", flag: "🇹🇯", dial: "+992" },
  KG: { name: "Kyrgyzstan", flag: "🇰🇬", dial: "+996" },
  TM: { name: "Turkmenistan", flag: "🇹🇲", dial: "+993" },
  SA: { name: "Saudi Arabia", flag: "🇸🇦", dial: "+966" },
  QA: { name: "Qatar", flag: "🇶🇦", dial: "+974" },
  KW: { name: "Kuwait", flag: "🇰🇼", dial: "+965" },
  AZ: { name: "Azerbaijan", flag: "🇦🇿", dial: "+994" },
};

/** Mahalliy CRM nomlari → ISO */
const NAME_TO_ISO: Record<string, string> = {
  "o'zbekiston": "UZ",
  ozbekiston: "UZ",
  uzbekistan: "UZ",
  "qozog'iston": "KZ",
  kazakhstan: "KZ",
  rossiya: "RU",
  russia: "RU",
  baa: "AE",
  uae: "AE",
  "united arab emirates": "AE",
  aqsh: "US",
  usa: "US",
  turkiya: "TR",
  turkey: "TR",
  germaniya: "DE",
  germany: "DE",
  "janubiy koreya": "KR",
  xitoy: "CN",
  china: "CN",
};

function flagFromIso(iso: string) {
  const code = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((c) => 127397 + c.charCodeAt(0))
  );
}

export function countryFromIso(iso: string): CountryInfo {
  const meta = ISO_META[iso];
  if (meta) return { iso, name: meta.name, flag: meta.flag, dial: meta.dial };
  return { iso, name: iso, flag: flagFromIso(iso), dial: "" };
}

/** Saqlangan davlat nomi yoki telefon orqali bayroq + nom. */
export function resolveCountry(opts: {
  country?: string | null;
  phone?: string | null;
}): CountryInfo | null {
  const phone = opts.phone?.trim();
  if (phone) {
    const parsed = parsePhoneNumberFromString(
      phone.startsWith("+") ? phone : phone.replace(/^998/, "+998")
    );
    if (parsed?.country) return countryFromIso(parsed.country);
    // Prefix fallback
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("998") || phone.startsWith("+998")) return countryFromIso("UZ");
    if (digits.startsWith("971") || phone.startsWith("+971")) return countryFromIso("AE");
    if (digits.startsWith("7") || phone.startsWith("+7")) return countryFromIso("RU");
    if (digits.startsWith("90") || phone.startsWith("+90")) return countryFromIso("TR");
    if (digits.startsWith("1") || phone.startsWith("+1")) return countryFromIso("US");
  }

  const name = opts.country?.trim();
  if (!name) return null;
  const iso = NAME_TO_ISO[name.toLowerCase()];
  if (iso) return countryFromIso(iso);
  return { iso: "", name, flag: "🏳️", dial: "" };
}

/** Telefon raqamidan davlat nomini aniqlaydi (eski API). */
export function detectCountryFromPhone(phone: string): string | null {
  const info = resolveCountry({ phone });
  if (!info) return null;
  // CRM SELECT uchun o'zbekcha nomlar
  const LOCAL: Record<string, string> = {
    UZ: "O'zbekiston",
    KZ: "Qozog'iston",
    RU: "Rossiya",
    US: "AQSH",
    TR: "Turkiya",
    AE: "BAA",
    DE: "Germaniya",
    KR: "Janubiy Koreya",
    CN: "Xitoy",
  };
  return LOCAL[info.iso] ?? info.name;
}
