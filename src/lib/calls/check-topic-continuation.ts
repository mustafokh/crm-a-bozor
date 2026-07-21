/** Yangi xabar avvalgi interaction mavzusining davomimi yoki butunlay yangi qiziqishmi — GPT tekshiruvi. */

const TOPIC_CONTINUATION_PROMPT = `Senga avvalgi suhbat mavzusi va yangi xabar beriladi.

Vazifa: yangi xabar avvalgi suhbatning DAVOMI bo'lsa "continues_same_topic": true, agar butunlay boshqa avtomobil/mavzu haqida bo'lsa (masalan avval Malibu, endi Toyota) — "continues_same_topic": false.

Faqat JSON:
{ "continues_same_topic": true/false, "reason": "qisqa izoh" }`;

export interface TopicContinuationResult {
  continues_same_topic: boolean;
  reason: string;
}

function extractJsonText(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

/** Avvalgi mavzu + yangi xabar — bir xil interaction davomimi? */
export async function checkTopicContinuation(params: {
  previousTopic: string;
  previousCarMake?: string | null;
  previousCarModel?: string | null;
  newMessage: string;
}): Promise<TopicContinuationResult> {
  const prev = [
    params.previousTopic,
    params.previousCarMake,
    params.previousCarModel,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!prev.trim()) {
    return { continues_same_topic: true, reason: "Avvalgi mavzu yo'q" };
  }

  const userContent = `Avvalgi mavzu: ${prev}\n\nYangi xabar:\n${params.newMessage.trim()}`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { continues_same_topic: true, reason: "OPENAI_API_KEY yo'q — davom deb qabul qilindi" };
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
        { role: "system", content: TOPIC_CONTINUATION_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    return { continues_same_topic: true, reason: "AI xatosi — davom deb qabul qilindi" };
  }

  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) {
    return { continues_same_topic: true, reason: "Bo'sh AI javobi" };
  }

  try {
    const parsed = JSON.parse(extractJsonText(content)) as Record<string, unknown>;
    return {
      continues_same_topic: parsed.continues_same_topic !== false,
      reason: String(parsed.reason ?? "").trim() || "Sabab ko'rsatilmagan",
    };
  } catch {
    return { continues_same_topic: true, reason: "JSON parse xatosi" };
  }
}
