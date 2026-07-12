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

export function buildCarInterest(data: CarTalkFields): string | null {
  const parts: string[] = [];
  if (data.carMake?.trim()) parts.push(data.carMake.trim());
  if (data.carModel?.trim()) parts.push(data.carModel.trim());
  if (data.carYear) parts.push(String(data.carYear));
  let line = parts.join(" ");
  if (data.carColor?.trim()) {
    line = line ? `${line} · ${data.carColor.trim()}` : data.carColor.trim();
  }
  if (line) return line;
  return data.carInterest?.trim() || null;
}

export function extractTalkFields(body: Record<string, unknown>) {
  const carYear = parseCarYear(body.carYear);
  const fields = {
    carMake: body.carMake ? String(body.carMake).trim() || null : null,
    carModel: body.carModel ? String(body.carModel).trim() || null : null,
    carYear,
    carColor: body.carColor ? String(body.carColor).trim() || null : null,
    budget: body.budget ? String(body.budget).trim() || null : null,
    paymentType: body.paymentType ? String(body.paymentType).trim() || null : null,
    clientWants: body.clientWants ? String(body.clientWants).trim() || null : null,
    discussionNotes: body.discussionNotes ? String(body.discussionNotes).trim() || null : null,
    outcome: body.outcome ? String(body.outcome).trim() || null : null,
  };
  return {
    ...fields,
    carInterest: buildCarInterest({
      ...fields,
      carInterest: body.carInterest ? String(body.carInterest) : null,
    }),
  };
}

export function formatCarShort(data: CarTalkFields): string {
  return buildCarInterest(data) ?? "—";
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
