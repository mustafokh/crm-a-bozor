const BUSINESS_RELEVANCE_PROMPT = `Quyidagi suhbat/qo'ng'iroq matnini o'qi va aniqla: bu suhbat avtomobil sotib olish/sotish, avtosalon xizmatlari, yoki shunga o'xshash BIZNES bilan bog'liqmi?

Agar suhbatda avtomobil, narx, model, rang, xarid, sinov haydash va shunga o'xshash mavzular haqida gap bo'lmasa (masalan bu shaxsiy suhbat, tanishlar orasidagi gaplashuv, yoki umuman avtomobilga aloqasi yo'q mavzu) - buni "is_business_related": false deb belgila.

Agar suhbat avtomobil/biznes bilan bog'liq bo'lsa - "is_business_related": true.

Faqat JSON qaytar:
{ "is_business_related": true/false, "reason": "qisqa izoh" }`;

export interface BusinessRelevanceResult {
  is_business_related: boolean;
  reason: string;
}

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function parseRelevancePayload(parsed: unknown): BusinessRelevanceResult {
  if (!parsed || typeof parsed !== "object") {
    return { is_business_related: true, reason: "AI javobi noto'g'ri — xavfsizlik uchun biznes deb qabul qilindi" };
  }
  const obj = parsed as Record<string, unknown>;
  const reason = String(obj.reason ?? "").trim() || "Sabab ko'rsatilmagan";
  if (typeof obj.is_business_related === "boolean") {
    return { is_business_related: obj.is_business_related, reason };
  }
  return { is_business_related: true, reason: "is_business_related maydoni yo'q — biznes deb qabul qilindi" };
}

/** Suhbat/qo'ng'iroq matni avtosalon biznesiga tegishlimi — GPT-4o-mini tekshiruvi. */
export async function checkBusinessRelevance(
  transcript: string,
  _source?: string
): Promise<BusinessRelevanceResult> {
  const text = transcript.trim();
  if (!text) {
    return { is_business_related: false, reason: "Bo'sh transkript" };
  }

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
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BUSINESS_RELEVANCE_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Business relevance OpenAI xatosi (${res.status}): ${errText.slice(0, 300)}`);
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    throw new Error("Business relevance: OpenAI javobida matn yo'q");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(content));
  } catch {
    throw new Error("Business relevance: OpenAI javobi JSON emas");
  }

  return parseRelevancePayload(parsed);
}
