import { normalizeTransmission, type CallAnalysis } from "./analyze-transcript";
import { countLabeledLines } from "./messaging-thread";
import { UNCLEAR_SUMMARY } from "./suspicious-transcript";

const MESSAGING_SYSTEM_PROMPT = `Sen avtosalon uchun WhatsApp/Telegram yozishmalarini tahlil qiluvchi yordamchisan.
Bu matn AUDIO transkripsiya EMAS — haqiqiy chat xabarlari. "Audio sifati past" deb HECH QACHON yozma.

Matn "Mijoz: ..." va "Xodim: ..." qatorlari bilan beriladi. BUTUN suhbat tarixini hisobga ol — ma'lumotlar turli xabarlarda bo'lishi mumkin (masalan, model birinchi xabarda, rang va byudjet keyinroq, ism alohida xabarda).

Oxirgi xabar qisqa bo'lsa ham (masalan "juda qimmat"), avvalgi xabarlardan model, rang, byudjet, ism va uzatma turini chiqar.

Agar xabar qisqa salom yoki oddiy savol bo'lsa ham, summary da BUTUN suhbat kontekstini qisqacha yoz — unclear qilma.

JSON struktura (faqat JSON qaytar):
{
  "employee_name": "xodim ismi yoki null",
  "customer_name": "mijozning ismi (suhbatda aytilgan bo'lsa)",
  "customer_intent": "buy | inquiry | complaint | other | null",
  "car_model": "qiziqqan avtomobil modeli",
  "car_color": "qiziqqan rang",
  "car_brand": "brend nomi",
  "car_transmission": "mexanika | avtomat | null",
  "budget": "mijoz aytgan byudjet/narx (matn, masalan '184000$')",
  "outcome": "purchased | not_purchased | price_objection | pending | callback_needed | null",
  "reason_purchased": null,
  "reason_not_purchased": "narx yuqori, o'ylab ko'rish va h.k.",
  "lead_source": "whatsapp | telegram | other | null",
  "summary": "BUTUN suhbatning 2-3 gapli qisqa xulosasi (faqat oxirgi xabar emas)",
  "sentiment": "positive | neutral | negative | null",
  "follow_up_needed": true/false,
  "follow_up_note": "null yoki qayta bog'lanish sababi"
}

OUTCOME qoidalari (MUHIM — vaziyatga qarab tanla):
- "price_objection" — mijoz narx/qimmat/byudjet haqida shikoyat qiladi ("qimmat", "expensive", "juda ko'p", "byudjetdan oshib ketdi", "No it is expensive for me") lekin avtomobilga qiziqishi saqlanadi yoki hali qaror qilmagan. BU not_purchased EMAS.
- "not_purchased" — mijoz aniq rad etdi yoki qiziqmaydi ("qiziqmayman", "kerak emas", "not interested", "don't want this car")
- "pending" — o'ylab ko'radi, keyinroq qaror qiladi
- "callback_needed" — qayta bog'lanish kerak
- "purchased" — sotib oldi yoki kelishildi

Misol: Toyota Land Cruiser $184k muhokama qilingan, mijoz "No it is expensive for me" desa → outcome: "price_objection" (NOT "not_purchased").`;

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
    carTransmission: normalizeTransmission(data.car_transmission),
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

/** Birinchi xabar / qisqa salom uchun AI chaqirmasdan tahlil yetarli. */
export function shouldUseLightMessagingAnalysis(
  threadText: string,
  latestLabeledLine: string
): boolean {
  const labeledLines = countLabeledLines(threadText);
  if (labeledLines > 1) return false;

  const threadWordCount = threadText.split(/\s+/).filter(Boolean).length;
  const latestText = extractMessageText(latestLabeledLine);
  const latestWordCount = latestText.split(/\s+/).filter(Boolean).length;

  return labeledLines <= 1 && latestWordCount <= 15 && threadWordCount <= 15;
}

/** WhatsApp/Telegram thread uchun yengil AI tahlil (audio hallucination yo'q). */
export async function analyzeMessagingTranscript(
  threadText: string,
  latestLabeledLine: string,
  employeeName?: string | null
): Promise<CallAnalysis> {
  if (shouldUseLightMessagingAnalysis(threadText, latestLabeledLine)) {
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
