import type { CallAnalysis } from "./analyze-transcript";
import { UNCLEAR_SUMMARY } from "./suspicious-transcript";

const MESSAGING_SYSTEM_PROMPT = `Sen avtosalon uchun WhatsApp/Telegram yozishmalarini tahlil qiluvchi yordamchisan.
Bu matn AUDIO transkripsiya EMAS — haqiqiy chat xabarlari. "Audio sifati past" deb HECH QACHON yozma.

Matn "Mijoz: ..." va "Xodim: ..." qatorlari bilan beriladi. BUTUN suhbat tarixini hisobga ol.

Agar xabar qisqa salom yoki oddiy savol bo'lsa ham, summary da xabar mazmunini qisqacha yoz — unclear qilma.

JSON struktura (faqat JSON qaytar):
{
  "employee_name": "xodim ismi yoki null",
  "customer_name": "mijoz ismi yoki null",
  "customer_intent": "buy | inquiry | complaint | other | null",
  "car_model": "model yoki null",
  "car_color": "rang yoki null",
  "car_brand": "brend yoki null",
  "car_transmission": "mexanika | avtomat | null",
  "budget": "byudjet matn yoki null",
  "outcome": "purchased | not_purchased | pending | callback_needed | null",
  "reason_purchased": null,
  "reason_not_purchased": null,
  "lead_source": "whatsapp | other | null",
  "summary": "oxirgi xabar va suhbat kontekstiga asoslangan 1-2 gapli xulosa",
  "sentiment": "positive | neutral | negative | null",
  "follow_up_needed": true/false,
  "follow_up_note": "null yoki qayta bog'lanish sababi"
}`;

/** Mijoz:/Xodim: yorlig'idan xabar matnini ajratadi. */
export function extractMessageText(labeledLine: string): string {
  const trimmed = labeledLine.trim();
  const m = trimmed.match(/^(Mijoz|Xodim)\s*:\s*(.*)$/is);
  return (m?.[2] ?? trimmed).trim();
}

/** AI chaqirmasdan oddiy xabar tahlili — qisqa WhatsApp xabarlari uchun. */
export function buildLightMessagingAnalysis(
  labeledLine: string,
  employeeName?: string | null
): CallAnalysis {
  const text = extractMessageText(labeledLine);
  return {
    employeeName: employeeName ?? null,
    customerName: null,
    customerIntent: text ? "inquiry" : null,
    carModel: null,
    carColor: null,
    carBrand: null,
    carTransmission: null,
    budget: null,
    outcome: "pending",
    reasonPurchased: null,
    reasonNotPurchased: null,
    leadSource: "whatsapp",
    summary: text || labeledLine.trim(),
    sentiment: null,
    followUpNeeded: false,
    followUpNote: null,
  };
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function parseMessagingPayload(raw: unknown): CallAnalysis {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    employeeName: asNullableString(data.employee_name),
    customerName: asNullableString(data.customer_name),
    customerIntent: asNullableString(data.customer_intent),
    carModel: asNullableString(data.car_model),
    carColor: asNullableString(data.car_color),
    carBrand: asNullableString(data.car_brand),
    carTransmission: asNullableString(data.car_transmission),
    budget: asNullableString(data.budget),
    outcome: asNullableString(data.outcome),
    reasonPurchased: asNullableString(data.reason_purchased),
    reasonNotPurchased: asNullableString(data.reason_not_purchased),
    leadSource: asNullableString(data.lead_source),
    summary: asNullableString(data.summary),
    sentiment: asNullableString(data.sentiment),
    followUpNeeded: Boolean(data.follow_up_needed),
    followUpNote: asNullableString(data.follow_up_note),
  };
}

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

/** Audio unclear xulosasini xabar matni bilan almashtiradi. */
export function sanitizeMessagingAnalysis(
  analysis: CallAnalysis,
  latestLabeledLine: string
): CallAnalysis {
  const fallback = extractMessageText(latestLabeledLine) || latestLabeledLine.trim();
  const summary = analysis.summary?.trim();
  const looksLikeAudioUnclear =
    summary === UNCLEAR_SUMMARY || analysis.outcome === "unclear";

  if (looksLikeAudioUnclear) {
    const hasExtractedData = Boolean(
      analysis.carModel || analysis.carBrand || analysis.budget || analysis.customerName
    );
    return {
      ...analysis,
      outcome: hasExtractedData ? "pending" : "pending",
      summary: fallback,
    };
  }

  if (!summary) {
    return { ...analysis, summary: fallback };
  }

  return analysis;
}

/** WhatsApp/Telegram thread uchun yengil AI tahlil (audio hallucination yo'q). */
export async function analyzeMessagingTranscript(
  threadText: string,
  latestLabeledLine: string,
  employeeName?: string | null
): Promise<CallAnalysis> {
  const latestText = extractMessageText(latestLabeledLine);
  const wordCount = latestText.split(/\s+/).filter(Boolean).length;

  if (wordCount <= 15) {
    const light = buildLightMessagingAnalysis(latestLabeledLine, employeeName);
    return sanitizeMessagingAnalysis(light, latestLabeledLine);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildLightMessagingAnalysis(latestLabeledLine, employeeName);
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MESSAGING_SYSTEM_PROMPT },
        { role: "user", content: threadText },
      ],
    }),
  });

  if (!res.ok) {
    return buildLightMessagingAnalysis(latestLabeledLine, employeeName);
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    return buildLightMessagingAnalysis(latestLabeledLine, employeeName);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(content));
  } catch {
    return buildLightMessagingAnalysis(latestLabeledLine, employeeName);
  }

  const analysis = parseMessagingPayload(parsed);
  if (employeeName?.trim()) {
    analysis.employeeName = employeeName.trim();
  }
  return sanitizeMessagingAnalysis(analysis, latestLabeledLine);
}
