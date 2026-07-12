"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getDictionary,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
  type TranslationDict,
} from "@/lib/i18n";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dict: TranslationDict;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return "uz";
  const stored = localStorage.getItem(LOCALE_COOKIE);
  if (isLocale(stored)) return stored;
  const match = document.cookie.match(new RegExp(`${LOCALE_COOKIE}=([^;]+)`));
  if (match && isLocale(match[1])) return match[1];
  return "uz";
}

function persistLocale(locale: Locale) {
  localStorage.setItem(LOCALE_COOKIE, locale);
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  document.documentElement.lang = locale;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("uz");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readStoredLocale();
    setLocaleState(initial);
    document.documentElement.lang = initial;
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const t = useMemo(() => {
    const fn = (key: string, params?: Record<string, string | number>) => {
      let text = dict[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return text;
    };
    return fn;
  }, [dict]);

  if (!ready) {
    return <>{children}</>;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dict }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // SSR / pre-hydration fallback
    const dict = getDictionary("uz");
    const t = (key: string, params?: Record<string, string | number>) => {
      let text = dict[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return text;
    };
    return { locale: "uz" as Locale, setLocale: () => {}, t, dict };
  }
  return ctx;
}

/** Build a translated enum map, e.g. `useEnumMap('enum.carStatus', Object.keys(CAR_STATUS))` */
export function useEnumMap(prefix: string, keys: string[]) {
  const { t } = useI18n();
  return useMemo(
    () => Object.fromEntries(keys.map((k) => [k, t(`${prefix}.${k}`)])),
    [t, prefix, keys]
  );
}
