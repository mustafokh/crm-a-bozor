export type Locale = "uz" | "ru" | "en";

export const LOCALES: Locale[] = ["uz", "ru", "en"];

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

export function isLocale(v: unknown): v is Locale {
  return v === "uz" || v === "ru" || v === "en";
}

export type TranslationDict = Record<string, string>;

/** Flat dot-notation lookup with optional `{name}` interpolation. */
export function createT(dict: TranslationDict) {
  return (key: string, params?: Record<string, string | number>) => {
    let text = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return text;
  };
}

export function enumLabels(
  t: ReturnType<typeof createT>,
  prefix: string,
  keys: string[]
): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, t(`${prefix}.${k}`)]));
}
