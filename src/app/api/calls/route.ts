import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-key-auth";
import { requirePermission } from "@/lib/api-auth";
import { normalizePhone, extractPhoneFromText } from "@/lib/phone";
import { detectCountryFromPhone } from "@/lib/calls/phone-country";
import { analyzeTranscript } from "@/lib/calls/analyze-transcript";
import { syncCallToLead } from "@/lib/calls/sync-lead";

interface CallPayload {
  phone?: string;
  raw_transcript?: string;
  transcript?: string;
  call_date?: string;
  duration_seconds?: number;
  file_name?: string;
  audio_url?: string;
  source?: string;
}

const MAX_BODY_BYTES = 512 * 1024;
const MAX_TRANSCRIPT_LEN = 100_000;
const MAX_FILE_NAME_LEN = 255;
const MAX_PHONE_LEN = 32;
const MAX_AUDIO_URL_LEN = 2048;
const VALID_SOURCES = new Set(["call", "whatsapp", "telegram"]);

function parseCallDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ixtiyoriy audio URL — faqat http(s) */
function parseAudioUrl(raw: unknown): { value: string | null; error?: string } {
  if (raw == null || raw === "") return { value: null };
  const url = String(raw).trim();
  if (!url) return { value: null };
  if (url.length > MAX_AUDIO_URL_LEN) return { value: null, error: "audio_url juda uzun" };
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { value: null, error: "audio_url http yoki https bo'lishi kerak" };
    }
    return { value: parsed.toString() };
  } catch {
    return { value: null, error: "audio_url formati noto'g'ri" };
  }
}

/** Tashqi tizimdan qo'ng'iroq/WhatsApp transkriptini qabul qilish (X-API-Key). */
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
  const phoneExtracted = extractPhoneFromText(phoneRaw);
  const rawTranscript = String(body.raw_transcript ?? body.transcript ?? "").trim();
  const fileName = body.file_name != null ? String(body.file_name).trim() : null;
  const audioParsed = parseAudioUrl(body.audio_url);
  const callDateRaw = String(body.call_date ?? "").trim();
  const sourceRaw = String(body.source ?? "call").trim().toLowerCase();
  const durationSeconds =
    body.duration_seconds != null && Number.isFinite(Number(body.duration_seconds))
      ? Math.max(0, Math.floor(Number(body.duration_seconds)))
      : null;

  const fields: Record<string, string> = {};
  if (!phoneRaw) fields.phone = "Telefon talab qilinadi";
  else if (phoneExtracted.replace(/\D/g, "").length >= 8 && phoneExtracted.length > MAX_PHONE_LEN) {
    fields.phone = "Telefon juda uzun";
  }
  if (!rawTranscript) fields.raw_transcript = "Transkript talab qilinadi";
  else if (rawTranscript.length > MAX_TRANSCRIPT_LEN) fields.raw_transcript = "Transkript juda uzun";
  if (fileName && fileName.length > MAX_FILE_NAME_LEN) fields.file_name = "Fayl nomi juda uzun";
  if (audioParsed.error) fields.audio_url = audioParsed.error;
  if (!callDateRaw) fields.call_date = "Qo'ng'iroq sanasi talab qilinadi";
  if (!VALID_SOURCES.has(sourceRaw)) fields.source = "Manba call, whatsapp yoki telegram bo'lishi kerak";

  const callDate = callDateRaw ? parseCallDate(callDateRaw) : null;
  if (callDateRaw && !callDate) {
    fields.call_date = "Sana formati noto'g'ri (ISO 8601 ishlating)";
  }

  if (Object.keys(fields).length > 0) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  let analysis;
  try {
    analysis = await analyzeTranscript(rawTranscript);
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI tahlil xatosi";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const phone = normalizePhone(phoneExtracted);
  const country = detectCountryFromPhone(phone);

  const call = await prisma.call.create({
    data: {
      phone,
      country,
      callDate: callDate!,
      durationSeconds,
      fileName,
      audioUrl: audioParsed.value,
      source: sourceRaw,
      rawTranscript,
      employeeName: analysis.employeeName,
      customerName: analysis.customerName,
      customerIntent: analysis.customerIntent,
      carModel: analysis.carModel,
      carColor: analysis.carColor,
      carBrand: analysis.carBrand,
      outcome: analysis.outcome,
      reasonPurchased: analysis.reasonPurchased,
      reasonNotPurchased: analysis.reasonNotPurchased,
      leadSource: analysis.leadSource,
      summary: analysis.summary,
      sentiment: analysis.sentiment,
      followUpNeeded: analysis.followUpNeeded,
      followUpNote: analysis.followUpNote,
    },
  });

  const lead = await syncCallToLead({
    phone,
    country,
    callDate: callDate!,
    channelSource: sourceRaw,
    analysis,
    rawTranscript,
    callId: call.id,
  });

  return NextResponse.json(
    {
      ok: true,
      id: call.id,
      lead_id: lead.id,
      country: call.country,
      audio_url: call.audioUrl,
      analysis: {
        employee_name: call.employeeName,
        customer_name: call.customerName,
        customer_intent: call.customerIntent,
        car_model: call.carModel,
        car_color: call.carColor,
        car_brand: call.carBrand,
        outcome: call.outcome,
        lead_source: call.leadSource,
        summary: call.summary,
        sentiment: call.sentiment,
        follow_up_needed: call.followUpNeeded,
      },
    },
    { status: 201 }
  );
}

/** Admin panel uchun qo'ng'iroqlar ro'yxati (filtrlash bilan). */
export async function GET(req: Request) {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const employee = searchParams.get("employee")?.trim();
  const outcome = searchParams.get("outcome")?.trim();
  const leadSource = searchParams.get("lead_source")?.trim();
  const country = searchParams.get("country")?.trim();
  const source = searchParams.get("source")?.trim();
  const dateFrom = searchParams.get("date_from")?.trim();
  const dateTo = searchParams.get("date_to")?.trim();
  const search = searchParams.get("search")?.trim();

  const where: Record<string, unknown> = {};

  if (employee) where.employeeName = { contains: employee, mode: "insensitive" };
  if (outcome) where.outcome = outcome;
  if (leadSource) where.leadSource = leadSource;
  if (country) where.country = country;
  if (source && VALID_SOURCES.has(source)) where.source = source;

  if (dateFrom || dateTo) {
    const callDate: Record<string, Date> = {};
    if (dateFrom) {
      const d = parseCallDate(dateFrom);
      if (d) callDate.gte = d;
    }
    if (dateTo) {
      const d = parseCallDate(dateTo);
      if (d) {
        d.setHours(23, 59, 59, 999);
        callDate.lte = d;
      }
    }
    if (Object.keys(callDate).length > 0) where.callDate = callDate;
  }

  if (search) {
    where.OR = [
      { phone: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { employeeName: { contains: search, mode: "insensitive" } },
      { carModel: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }

  const calls = await prisma.call.findMany({
    where,
    orderBy: { callDate: "desc" },
    take: 500,
  });

  const employees = await prisma.call.findMany({
    where: { employeeName: { not: null } },
    select: { employeeName: true },
    distinct: ["employeeName"],
    orderBy: { employeeName: "asc" },
  });

  return NextResponse.json({
    calls,
    filters: {
      employees: employees.map((e) => e.employeeName).filter(Boolean),
    },
  });
}
