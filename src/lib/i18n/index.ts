import { uz } from "./translations/uz";
import { ru } from "./translations/ru";
import { en } from "./translations/en";
import {
  createT,
  isLocale,
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT,
  type Locale,
  type TranslationDict,
} from "./types";

export {
  createT,
  isLocale,
  enumLabels,
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT,
  type Locale,
  type TranslationDict,
} from "./types";

const DICTS: Record<Locale, TranslationDict> = { uz, ru, en };

export const LOCALE_COOKIE = "mkus_locale";

export function getDictionary(locale: Locale): TranslationDict {
  return DICTS[locale] ?? DICTS.uz;
}

export function getT(locale: Locale) {
  return createT(getDictionary(locale));
}
