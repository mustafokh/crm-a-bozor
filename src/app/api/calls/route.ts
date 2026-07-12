import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-key-auth";
import { normalizePhone } from "@/lib/phone";

interface CallPayload {
  phone?: string;
  transcript?: string;
  call_date?: string;
  file_name?: string;
}

const MAX_BODY_BYTES = 512 * 1024; // 512 KB
const MAX_TRANSCRIPT_LEN = 100_000;
const MAX_FILE_NAME_LEN = 255;
const MAX_PHONE_LEN = 32;

function parseCallDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Tashqi tizimdan qo'ng'iroq transkriptini qabul qilish (X-API-Key talab qilinadi). */
export async function POST(req: Request) {
  const authError = verifyApiKey(req);
  if (authError) return authError;

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "So'rov hajmi juda katta" }, { status: 413 });
  }

  let body: CallPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }

  const phoneRaw = String(body.phone ?? "").trim();
  const transcript = String(body.transcript ?? "").trim();
  const fileName = String(body.file_name ?? "").trim();
  const callDateRaw = String(body.call_date ?? "").trim();

  const fields: Record<string, string> = {};
  if (!phoneRaw) fields.phone = "Telefon talab qilinadi";
  else if (phoneRaw.length > MAX_PHONE_LEN) fields.phone = "Telefon juda uzun";
  if (!transcript) fields.transcript = "Transkript talab qilinadi";
  else if (transcript.length > MAX_TRANSCRIPT_LEN) fields.transcript = "Transkript juda uzun";
  if (!fileName) fields.file_name = "Fayl nomi talab qilinadi";
  else if (fileName.length > MAX_FILE_NAME_LEN) fields.file_name = "Fayl nomi juda uzun";
  if (!callDateRaw) fields.call_date = "Qo'ng'iroq sanasi talab qilinadi";

  const callDate = callDateRaw ? parseCallDate(callDateRaw) : null;
  if (callDateRaw && !callDate) {
    fields.call_date = "Sana formati noto'g'ri (ISO 8601 ishlating)";
  }

  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const call = await prisma.call.create({
    data: {
      phone: normalizePhone(phoneRaw),
      transcript,
      callDate: callDate!,
      fileName,
    },
  });

  return NextResponse.json({ ok: true, id: call.id }, { status: 201 });
}
