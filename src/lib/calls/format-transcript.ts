/** Telefon suhbatini Mijoz/Xodim dialog formatiga keltirish (GPT-4o-mini). */

export const FORMAT_TRANSCRIPT_SYSTEM_PROMPT = `Senga telefon suhbatining xom transkripti beriladi. Bu ikki kishi orasidagi suhbat: mijoz (qo'ng'iroq qiluvchi yoki javob beruvchi) va xodim (avtosalon xodimi).

Vazifang: matnni o'qib, kontekst asosida (savol-javob mantig'i, kim savol berayotgani, kim javob berayotgani, salomlashish/xayrlashish so'zlari) matnni ikki ishtirokchi orasida to'g'ri bo'lib, quyidagi formatda qayta yoz:

Mijoz: [gap]
Xodim: [gap]
Mijoz: [gap]
Xodim: [gap]
...

Agar kim gapirganini aniq ajratib bo'lmasa, eng mantiqiy taxminni qil. Original matnning mazmunini o'zgartirma, faqat kim aytganini ajratib, formatlashtir. Faqat formatlashtirilgan dialogni qaytar, boshqa izoh qo'shma.`;

const LABELED_LINE_RE = /^(Mijoz|Xodim)\s*:/i;

/** Matn allaqachon Mijoz:/Xodim: qatorlari bilan yorliqlanganmi. */
export function isAlreadyLabeledDialog(text: string): boolean {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return false;
  const labeled = lines.filter((l) => LABELED_LINE_RE.test(l));
  // Kamida bitta yorliq va yorliqli qatorlarning ko'pchiligi
  if (labeled.length === 0) return false;
  if (lines.length === 1) return labeled.length === 1;
  return labeled.length / lines.length >= 0.5;
}

/** Model javobidan faqat dialog qatorlarini tozalab olish. */
export function sanitizeFormattedDialog(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withoutFence = trimmed
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const lines = withoutFence
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const dialogLines: string[] = [];
  for (const line of lines) {
    const m = line.match(/^(Mijoz|Xodim)\s*:\s*(.*)$/i);
    if (!m) continue;
    const speaker = /^mijoz$/i.test(m[1]!) ? "Mijoz" : "Xodim";
    const content = (m[2] ?? "").trim();
    if (!content) continue;
    dialogLines.push(`${speaker}: ${content}`);
  }

  if (dialogLines.length === 0) return null;
  return dialogLines.join("\n");
}

/**
 * Xom transkriptni Mijoz/Xodim dialogiga formatlaydi.
 * Xatolikda null qaytaradi (chaqiruvchi raw bilan davom etadi).
 */
export async function formatTranscriptAsDialog(
  rawTranscript: string
): Promise<string | null> {
  const text = rawTranscript.trim();
  if (!text) return null;

  if (isAlreadyLabeledDialog(text)) {
    return sanitizeFormattedDialog(text) ?? text;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("formatTranscriptAsDialog: OPENAI_API_KEY yo'q");
    return null;
  }

  const model = process.env.OPENAI_FORMAT_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: FORMAT_TRANSCRIPT_SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(
        `formatTranscriptAsDialog OpenAI xatosi (${res.status}):`,
        errText.slice(0, 300)
      );
      return null;
    }

    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      console.error("formatTranscriptAsDialog: bo'sh javob");
      return null;
    }

    return sanitizeFormattedDialog(content);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("formatTranscriptAsDialog failed:", message);
    return null;
  }
}
