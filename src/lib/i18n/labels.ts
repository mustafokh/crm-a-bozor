import { resolveCarColor } from "@/lib/car-color";
import { COUNTRY_OPTIONS } from "@/lib/constants";
import type { createT } from "./types";

export type TFn = ReturnType<typeof createT>;

/** Stored country name (Uzbek) → translation key slug */
export const COUNTRY_VALUE_TO_KEY: Record<string, string> = {
  "O'zbekiston": "UZ",
  "Qozog'iston": "KZ",
  Rossiya: "RU",
  AQSH: "US",
  Turkiya: "TR",
  BAA: "AE",
  Germaniya: "DE",
  "Janubiy Koreya": "KR",
  Xitoy: "CN",
  Boshqa: "OTHER",
};

export const COUNTRY_KEYS = COUNTRY_OPTIONS.map(
  (name) => COUNTRY_VALUE_TO_KEY[name] ?? name
);

function enumLabel(t: TFn, prefix: string, key: string, fallback?: string): string {
  const full = `${prefix}.${key}`;
  const text = t(full);
  return text !== full ? text : (fallback ?? key);
}

export function countryLabel(t: TFn, value?: string | null): string {
  if (!value?.trim()) return "—";
  const slug = COUNTRY_VALUE_TO_KEY[value.trim()];
  if (slug) return enumLabel(t, "enum.country", slug, value);
  return value;
}

export function countryLabelFromIso(t: TFn, iso?: string | null): string {
  if (!iso?.trim()) return "—";
  return enumLabel(t, "enum.country", iso.toUpperCase(), iso);
}

export function leadSourceLabel(t: TFn, source?: string | null): string {
  if (!source?.trim()) return "—";
  return enumLabel(t, "enum.leadSource", source.trim(), source);
}

export function callSourceTypeLabel(t: TFn, source?: string | null): string {
  if (!source?.trim()) return "—";
  const key = source.trim().toLowerCase();
  return enumLabel(t, "enum.callSourceType", key, source);
}

export function paymentTypeLabel(t: TFn, key?: string | null): string {
  if (!key?.trim()) return "—";
  return enumLabel(t, "enum.paymentType", key.trim(), key);
}

export function carColorLabel(t: TFn, raw?: string | null): string {
  if (!raw?.trim()) return "—";
  const info = resolveCarColor(raw);
  if (!info) return raw.trim();
  if (info.key === "custom") return raw.trim();
  return enumLabel(t, "enum.carColor", info.key, info.labelEn);
}

export function roleLabel(t: TFn, role?: string | null): string {
  if (!role?.trim()) return "—";
  return enumLabel(t, "enum.role", role.trim(), role);
}

export function contractStatusLabel(t: TFn, status?: string | null): string {
  if (!status?.trim()) return "—";
  return enumLabel(t, "enum.contractStatus", status.trim(), status);
}

export function carStatusLabel(t: TFn, status?: string | null): string {
  if (!status?.trim()) return "—";
  return enumLabel(t, "enum.carStatus", status.trim(), status);
}

export function carConditionLabel(t: TFn, condition?: string | null): string {
  if (!condition?.trim()) return "—";
  return enumLabel(t, "enum.carCondition", condition.trim(), condition);
}

export function transmissionEnumLabel(t: TFn, value?: string | null): string {
  if (!value?.trim()) return "—";
  return enumLabel(t, "enum.transmission", value.trim(), value);
}

export function fuelTypeLabel(t: TFn, value?: string | null): string {
  if (!value?.trim()) return "—";
  return enumLabel(t, "enum.fuel", value.trim(), value);
}

export function drivetrainLabel(t: TFn, value?: string | null): string {
  if (!value?.trim()) return "—";
  return enumLabel(t, "enum.drivetrain", value.trim(), value);
}

export function expenseCategoryLabel(t: TFn, key?: string | null): string {
  if (!key?.trim()) return "—";
  return enumLabel(t, "enum.expenseCategory", key.trim(), key);
}
