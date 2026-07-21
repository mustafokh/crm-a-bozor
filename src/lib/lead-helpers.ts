import { UNCLEAR_SUMMARY } from "@/lib/calls/suspicious-transcript";
import { LEAD_OUTCOME, LEAD_OUTCOMES } from "@/lib/constants";

/** Mashina va gaplashuv maydonlarini birlashtirish */

export interface CarTalkFields {
  carMake?: string | null;
  carModel?: string | null;
  carYear?: number | string | null;
  carColor?: string | null;
  carInterest?: string | null;
  budget?: string | null;
  paymentType?: string | null;
  clientWants?: string | null;
  discussionNotes?: string | null;
  outcome?: string | null;
}

export function parseCarYear(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1950 && n <= new Date().getFullYear() + 2 ? n : null;
}

/** Model nomidan make prefiksini olib tashlaydi (masalan: Toyota + Toyota Land Cruiser). */
export function stripMakeFromModel(make?: string | null, model?: string | null): string {
  const mk = make?.trim() ?? "";
  let m = model?.trim() ?? "";
  if (mk && m.toLowerCase().startsWith(mk.toLowerCase())) {
    m = m.slice(mk.length).trim();
  }
  return m;
}

/** Make + model + year (rang alohida badge bilan ko‘rsatiladi) */
export function formatCarModel(data: CarTalkFields): string {
  const make = data.carMake?.trim() ?? "";
  const model = stripMakeFromModel(make, data.carModel);
  const parts: string[] = [];
  if (make) parts.push(make);
  if (model) parts.push(model);
  if (data.carYear) parts.push(String(data.carYear));
  return parts.join(" ").trim();
}

/** DB/API dan kelgan outcome qiymatini LEAD_OUTCOMES kalitiga keltiradi. */
export function normalizeLeadOutcome(key?: string | null): string | null {
  if (!key?.trim()) return null;
  const trimmed = key.trim();
  const prefixed = trimmed.match(/^enum\.(?:lead|Lead)Outcome\.([A-Z_]+)$/);
  if (prefixed) return prefixed[1];
  if (LEAD_OUTCOMES.includes(trimmed)) return trimmed;
  return trimmed;
}

export function leadOutcomeLabel(
  t: (key: string) => string,
  key?: string | null
): string {
  const normalized = normalizeLeadOutcome(key);
  if (!normalized) return "—";
  const translated = t(`enum.leadOutcome.${normalized}`);
  if (translated !== `enum.leadOutcome.${normalized}`) return translated;
  return LEAD_OUTCOME[normalized] ?? normalized;
}

export function buildCarInterest(data: CarTalkFields): string | null {
  const model = formatCarModel(data);
  if (data.carColor?.trim()) {
    return model ? `${model} · ${data.carColor.trim()}` : data.carColor.trim();
  }
  if (model) return model;
  return data.carInterest?.trim() || null;
}

export function extractTalkFields(body: Record<string, unknown>) {
  const carYear = parseCarYear(body.carYear);
  const fields = {
    carMake: body.carMake ? String(body.carMake).trim() || null : null,
    carModel: (() => {
      const make = body.carMake ? String(body.carMake).trim() || null : null;
      const raw = body.carModel ? String(body.carModel).trim() || null : null;
      if (!raw) return null;
      const stripped = stripMakeFromModel(make, raw);
      return stripped || null;
    })(),
    carYear,
    carColor: body.carColor ? String(body.carColor).trim() || null : null,
    budget: body.budget ? String(body.budget).trim() || null : null,
    paymentType: body.paymentType ? String(body.paymentType).trim() || null : null,
    clientWants: body.clientWants ? String(body.clientWants).trim() || null : null,
    discussionNotes: body.discussionNotes ? String(body.discussionNotes).trim() || null : null,
    outcome: normalizeLeadOutcome(body.outcome ? String(body.outcome) : null),
  };
  return {
    ...fields,
    carInterest: buildCarInterest({
      ...fields,
      carInterest: body.carInterest ? String(body.carInterest) : null,
    }),
  };
}

/** Jadval/UI: faqat mashina (rang CarColorBadge da) */
export function formatCarShort(data: CarTalkFields): string {
  return formatCarModel(data) || data.carInterest?.trim() || "—";
}

export function hasTalkContent(fields: ReturnType<typeof extractTalkFields>, talkedAt?: unknown) {
  return Boolean(
    talkedAt ||
      fields.discussionNotes ||
      fields.carInterest ||
      fields.carMake ||
      fields.carModel ||
      fields.clientWants ||
      fields.outcome
  );
}

/** WhatsApp/Telegram avtomatik sync dan yaratilgan takroriy gaplashuv yozuvlarini yashirish. */
export function filterManualConversations<
  T extends {
    discussionNotes?: string | null;
    outcome?: string | null;
    carMake?: string | null;
    carModel?: string | null;
    carInterest?: string | null;
  },
>(conversations: T[] | null | undefined): T[] {
  if (!conversations?.length) return [];
  return conversations.filter((c) => {
    const notes = c.discussionNotes?.trim() ?? "";
    if (notes === UNCLEAR_SUMMARY) return false;
    if (
      /^(Mijoz|Xodim)\s*:/i.test(notes) &&
      !c.carMake &&
      !c.carModel &&
      !c.carInterest &&
      c.outcome === "UNCLEAR"
    ) {
      return false;
    }
    return true;
  });
}
