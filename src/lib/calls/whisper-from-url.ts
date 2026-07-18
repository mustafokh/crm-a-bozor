/**
 * Fetch remote audio and transcribe with OpenAI Whisper (language=en by default).
 * Used when POST /api/calls has audio_url but empty transcript.
 */

export async function whisperFromAudioUrl(
  audioUrl: string,
  opts?: { language?: string; apiKey?: string }
): Promise<string> {
  const apiKey = opts?.apiKey || process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const language = opts?.language || process.env.WHISPER_LANGUAGE || "en";

  const audioRes = await fetch(audioUrl, { redirect: "follow" });
  if (!audioRes.ok) {
    throw new Error(`Audio download failed: ${audioRes.status}`);
  }
  const buf = Buffer.from(await audioRes.arrayBuffer());
  if (buf.length < 64) throw new Error("Audio too small");
  if (buf.length > 25 * 1024 * 1024) throw new Error("Audio too large (>25MB)");

  const contentType = audioRes.headers.get("content-type") || "application/octet-stream";
  let ext = "mp3";
  try {
    const path = new URL(audioUrl).pathname.toLowerCase();
    const m = path.match(/\.(mp3|wav|m4a|ogg|webm|amr|mp4|mpeg|mpga)$/);
    if (m) ext = m[1] === "mpga" ? "mp3" : m[1];
  } catch {
    /* keep mp3 */
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buf)], { type: contentType }),
    `call.${ext}`
  );
  form.append("model", "whisper-1");
  form.append("language", language);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const body = (await res.json()) as { text?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(body.error?.message || `Whisper ${res.status}`);
  const text = (body.text || "").trim();
  if (!text) throw new Error("Empty Whisper transcript");
  return text;
}
