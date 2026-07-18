export interface CallAnalysis {
  employeeName: string | null;
  customerName: string | null;
  customerIntent: string | null;
  carModel: string | null;
  carColor: string | null;
  carBrand: string | null;
  carTransmission: string | null;
  budget: string | null;
  outcome: string | null;
  reasonPurchased: string | null;
  reasonNotPurchased: string | null;
  leadSource: string | null;
  summary: string | null;
  sentiment: string | null;
  followUpNeeded: boolean;
  followUpNote: string | null;
}

const SYSTEM_PROMPT = `Sen avtosalon uchun qo'ng'iroq/suhbat matnlarini tahlil qiluvchi yordamchisan. 
Berilgan transkriptdan quyidagi ma'lumotlarni aniq JSON formatda chiqar. 
Agar biror ma'lumot matnda yo'q yoki aniq bo'lmasa, null qo'y - hech narsani o'ylab topma.

WhatsApp/Telegram suhbatlari odatda "Mijoz: ..." va "Xodim: ..." qatorlari bilan beriladi.
BUTUN suhbat tarixini hisobga ol — ma'lumotlar turli xabarlarda bo'lishi mumkin (masalan, model birinchi xabarda, rang keyinroq).

MUHIM — past sifatli / Whisper hallucination:
Agar transkript gibberish, mantiqsiz so'zlar, bir-biriga bog'liq bo'lmagan random so'zlar yoki til aralashmasi bo'lib, haqiqiy suhbatga o'xshamasa (yomon audio):
- Barcha maydonlarni null qoldir (follow_up_needed = false)
- "outcome" ni "unclear" qilib qo'y
- "summary" ni AYNAN shu matn qilib qo'y (o'zgartirma): Audio sifati past, aniq transkripsiya qilib bo'lmadi
Haqiqiy suhbatni o'ylab topma.

JSON struktura:
{
  "employee_name": "qo'ng'iroqqa javob bergan/gaplashgan xodim ismi (agar aytilgan bo'lsa)",
  "customer_name": "mijozning ismi va familiyasi",
  "customer_intent": "buy | inquiry | complaint | other",
  "car_model": "qiziqqan avtomobil modeli",
  "car_color": "qiziqqan rang",
  "car_brand": "brend nomi",
  "car_transmission": "mijoz qiziqqan avtomobilning uzatmalar qutisi turi: mexanika | avtomat | null (agar aytilmagan bo'lsa)",
  "budget": "mijoz aytgan byudjet/narx diapazoni (matn, masalan '15000$' yoki '200 mln')",
  "outcome": "purchased | not_purchased | pending | callback_needed | unclear",
  "reason_purchased": "agar sotib olgan bo'lsa - sababi",
  "reason_not_purchased": "agar sotib olmagan bo'lsa - sababi (narx, model yo'qligi, boshqa joydan olgani va h.k.)",
  "lead_source": "website | olx | whatsapp | referral | walk_in | other | unknown",
  "summary": "suhbatning 2-3 gapli qisqa xulosasi",
  "sentiment": "positive | neutral | negative",
  "follow_up_needed": true/false,
  "follow_up_note": "agar kerak bo'lsa, nima uchun qayta bog'lanish kerak"
}

Faqat shu JSON'ni qaytar, boshqa hech qanday matn qo'shma.`;

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/** AI javobini mexanika | avtomat | null ga normalizatsiya qiladi. */
export function normalizeTransmission(value: unknown): string | null {
  const raw = asNullableString(value);
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (
    v.includes("mexanik") ||
    v.includes("manual") ||
    v.includes("mt") ||
    v === "механика" ||
    v.includes("механ")
  ) {
    return "mexanika";
  }
  if (
    v.includes("avtomat") ||
    v.includes("automat") ||
    v.includes("auto") ||
    v === "at" ||
    v.includes("cvt") ||
    v.includes("автомат")
  ) {
    return "avtomat";
  }
  return null;
}

function parseAnalysisPayload(raw: unknown): CallAnalysis {
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

/** OpenAI orqali transkriptni tuzilgan maydonlarga ajratadi. */
export async function analyzeTranscript(rawTranscript: string): Promise<CallAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY sozlanmagan");
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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawTranscript },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI xatosi (${res.status}): ${errText.slice(0, 300)}`);
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("OpenAI javobida matn yo'q");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(content));
  } catch {
    throw new Error("OpenAI javobi JSON emas");
  }

  return parseAnalysisPayload(parsed);
}
