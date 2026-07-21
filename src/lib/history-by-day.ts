import type { Locale } from "@/lib/i18n/types";

export const HISTORY_TZ = "Asia/Tashkent";

/** Calendar day key (YYYY-MM-DD) in Asia/Tashkent. */
export function getDayKey(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HISTORY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getTodayDayKey(): string {
  return getDayKey(new Date())!;
}

function shiftDayKey(dayKey: string, days: number): string {
  const anchor = new Date(`${dayKey}T12:00:00+05:00`);
  anchor.setDate(anchor.getDate() + days);
  return getDayKey(anchor)!;
}

const LOCALE_DATE: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-GB",
};

export function formatHistoryDayLabel(
  dayKey: string,
  locale: Locale,
  t: (key: string) => string
): string {
  const today = getTodayDayKey();
  const yesterday = shiftDayKey(today, -1);
  if (dayKey === today) return t("leads.dayToday");
  if (dayKey === yesterday) return t("leads.dayYesterday");

  const date = new Date(`${dayKey}T12:00:00+05:00`);
  return new Intl.DateTimeFormat(LOCALE_DATE[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: HISTORY_TZ,
  }).format(date);
}

export interface DayGroup<T> {
  dayKey: string;
  items: T[];
}

/** Group items by calendar day (newest day first). Items without a date are omitted. */
export function groupByDay<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined
): DayGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getDayKey(getDate(item));
    if (!key) continue;
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, groupItems]) => ({ dayKey, items: groupItems }));
}
