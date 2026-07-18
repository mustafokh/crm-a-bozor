import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-key-auth";
import { requirePermission } from "@/lib/api-auth";
import { normalizePhone, extractPhoneFromText } from "@/lib/phone";
import { detectCountryFromPhone } from "@/lib/calls/phone-country";
import { analyzeTranscript } from "@/lib/calls/analyze-transcript";
import { syncCallToLead } from "@/lib/calls/sync-lead";
import { resolveCallDirection } from "@/lib/calls/call-direction";
import { inferTransmissionFromText } from "@/lib/calls/latest-call";
import {
  appendTranscriptLine,
  labelMessage,
  mergeThreadTranscripts,
  resolveMessageDirection,
} from "@/lib/calls/messaging-thread";

interface CallPayload {
  phone?: string;
  raw_transcript?: string;
  transcript?: string;
  call_date?: string;
  duration_seconds?: number;
  file_name?: string;
  audio_url?: string;
  source?: string;
  /** incoming | outgoing (yoki inbound/outbound) */
  direction?: string;
  from_me?: boolean | string | number;
  /** Xodim ismi — WhatsApp session'dan kelganda AI o'rniga ishlatiladi */
  employee_name?: string;
}

/** Messaging kanallarida bitta contact = bitta call yozuvi (suhbat thread). */
const THREAD_SOURCES = new Set(["whatsapp", "telegram"]);

const MAX_BODY_BYTES = 512 * 1024;
const MAX_TRANSCRIPT_LEN = 100_000;
const MAX_FILE_NAME_LEN = 2048;
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

function isMissingColumnError(message: string, column: string): boolean {
  const m = message.toLowerCase();
  return m.includes(column.toLowerCase()) && (m.includes("does not exist") || m.includes("unknown column"));
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
  const fileName = body.file_name != null ? String(body.file_name).trim() || null : null;
  const audioParsed = parseAudioUrl(body.audio_url);
  const callDateRaw = String(body.call_date ?? "").trim();
  const sourceRaw = String(body.source ?? "call").trim().toLowerCase();
  const durationSeconds =
    body.duration_seconds != null && Number.isFinite(Number(body.duration_seconds))
      ? Math.max(0, Math.floor(Number(body.duration_seconds)))
      : null;

  const callDirection = resolveCallDirection({
    direction: body.direction,
    from_me: body.from_me,
    fileName,
    source: sourceRaw,
  });

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

  let phone: string;
  let country: string | null;
  try {
    phone = normalizePhone(phoneExtracted);
    country = detectCountryFromPhone(phone);
  } catch (e) {
    const message = e instanceof Error ? e.message : "phone/country detection failed";
    console.error("POST /api/calls phone detection error:", message);
    return NextResponse.json({ error: "Server xatosi", detail: message }, { status: 500 });
  }

  if (THREAD_SOURCES.has(sourceRaw) && fileName) {
    const duplicate = await prisma.call.findFirst({
      where: { fileName, source: sourceRaw },
      select: { id: true, leadId: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { ok: true, id: duplicate.id, lead_id: duplicate.leadId, deduped: true },
        { status: 200 }
      );
    }
  }

  let transcriptForAnalysis = rawTranscript;
  let existingThreadId: string | null = null;
  let siblingIds: string[] = [];
  let refreshConversation = false;

  if (THREAD_SOURCES.has(sourceRaw)) {
    const msgDir = resolveMessageDirection(body);
    const labeledLine = labelMessage(rawTranscript, msgDir);

    const threads = await prisma.call.findMany({
      where: { phone, source: sourceRaw },
      orderBy: [{ callDate: "asc" }, { createdAt: "asc" }],
      select: { id: true, rawTranscript: true },
    });

    if (threads.length > 0) {
      const mergedHistory = mergeThreadTranscripts(threads.map((t) => t.rawTranscript));
      transcriptForAnalysis = appendTranscriptLine(mergedHistory, labeledLine);
      existingThreadId = threads[threads.length - 1]!.id;
      siblingIds = threads.slice(0, -1).map((t) => t.id);
      refreshConversation = true;
    } else {
      transcriptForAnalysis = labeledLine;
    }

    if (transcriptForAnalysis.length > MAX_TRANSCRIPT_LEN) {
      let clipped = transcriptForAnalysis.slice(-MAX_TRANSCRIPT_LEN);
      const nl = clipped.indexOf("\n");
      if (nl > 0 && nl < 400) clipped = clipped.slice(nl + 1);
      transcriptForAnalysis = clipped;
    }
  }

  let analysis;
  try {
    analysis = await analyzeTranscript(transcriptForAnalysis);
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI tahlil xatosi";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  // WhatsApp session xodimi — AI taxminidan ustun
  const employeeOverride = String(body.employee_name ?? "").trim();
  if (employeeOverride) {
    analysis = { ...analysis, employeeName: employeeOverride };
  }

  // AI null qaytarsa — matndan mexanika/avtomat ni qo‘shimcha qidiramiz
  if (!analysis.carTransmission) {
    analysis = {
      ...analysis,
      carTransmission: inferTransmissionFromText(transcriptForAnalysis),
    };
  }

  const analysisFields = {
    employeeName: analysis.employeeName,
    customerName: analysis.customerName,
    customerIntent: analysis.customerIntent,
    carModel: analysis.carModel,
    carColor: analysis.carColor,
    carBrand: analysis.carBrand,
    carTransmission: analysis.carTransmission,
    outcome: analysis.outcome,
    reasonPurchased: analysis.reasonPurchased,
    reasonNotPurchased: analysis.reasonNotPurchased,
    leadSource: analysis.leadSource,
    summary: analysis.summary,
    sentiment: analysis.sentiment,
    followUpNeeded: analysis.followUpNeeded,
    followUpNote: analysis.followUpNote,
  };

  const callData: Parameters<typeof prisma.call.create>[0]["data"] = {
    phone,
    country,
    callDate: callDate!,
    durationSeconds,
    fileName,
    audioUrl: audioParsed.value,
    source: sourceRaw,
    direction: callDirection,
    rawTranscript: transcriptForAnalysis,
    ...analysisFields,
  };

  let callId: string;
  let createdNew = false;

  try {
    if (existingThreadId) {
      await prisma.call.update({
        where: { id: existingThreadId },
        data: {
          country,
          callDate: callDate!,
          durationSeconds,
          fileName,
          ...(audioParsed.value ? { audioUrl: audioParsed.value } : {}),
          ...(callDirection ? { direction: callDirection } : {}),
          rawTranscript: transcriptForAnalysis,
          ...analysisFields,
        },
        select: { id: true },
      });
      callId = existingThreadId;
      if (siblingIds.length > 0) {
        await prisma.call.deleteMany({ where: { id: { in: siblingIds } } });
      }
    } else {
      const call = await prisma.call.create({
        data: callData,
        select: { id: true },
      });
      callId = call.id;
      createdNew = true;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "call.create failed";
    console.error("POST /api/calls create/update error:", message);

    const retryData: Record<string, unknown> = { ...callData };
    if (isMissingColumnError(message, "audio_url") || isMissingColumnError(message, "audioUrl")) {
      delete retryData.audioUrl;
    }
    if (isMissingColumnError(message, "car_transmission") || isMissingColumnError(message, "carTransmission")) {
      delete retryData.carTransmission;
    }
    if (isMissingColumnError(message, "direction")) {
      delete retryData.direction;
    }

    try {
      if (existingThreadId) {
        const updateRetry: Record<string, unknown> = {
          country,
          callDate: callDate!,
          durationSeconds,
          fileName,
          rawTranscript: transcriptForAnalysis,
          ...analysisFields,
        };
        if (retryData.audioUrl !== undefined) updateRetry.audioUrl = retryData.audioUrl;
        if (retryData.direction !== undefined) updateRetry.direction = retryData.direction;
        if (retryData.carTransmission === undefined) delete updateRetry.carTransmission;
        await prisma.call.update({
          where: { id: existingThreadId },
          data: updateRetry as any,
          select: { id: true },
        });
        callId = existingThreadId;
      } else {
        const retryCall = await prisma.call.create({
          data: retryData as typeof callData,
          select: { id: true },
        });
        callId = retryCall.id;
        createdNew = true;
      }
    } catch (e2) {
      const message2 = e2 instanceof Error ? e2.message : "call persist retry failed";
      return NextResponse.json({ error: "Server xatosi", detail: message2 }, { status: 500 });
    }
  }

  let lead: Awaited<ReturnType<typeof syncCallToLead>>;
  try {
    lead = await syncCallToLead({
      phone,
      country,
      callDate: callDate!,
      channelSource: sourceRaw,
      analysis,
      rawTranscript: transcriptForAnalysis,
      callId,
      refreshConversation,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "syncCallToLead failed";
    console.error("POST /api/calls sync error:", message);
    if (isMissingColumnError(message, "audio_url") || message.includes("calls.audio_url")) {
      const existingLead = await prisma.lead.findFirst({
        where: { phone },
        orderBy: { updatedAt: "desc" },
      });
      if (existingLead) {
        lead = existingLead;
      } else {
        return NextResponse.json({ error: "Server xatosi", detail: message }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Server xatosi", detail: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      id: callId,
      lead_id: lead.id,
      country,
      audio_url: audioParsed.value,
      direction: callDirection,
      thread_updated: !createdNew,
      analysis: {
        employee_name: analysis.employeeName,
        customer_name: analysis.customerName,
        customer_intent: analysis.customerIntent,
        car_model: analysis.carModel,
        car_color: analysis.carColor,
        car_brand: analysis.carBrand,
        car_transmission: analysis.carTransmission,
        budget: analysis.budget,
        outcome: analysis.outcome,
        lead_source: analysis.leadSource,
        summary: analysis.summary,
        sentiment: analysis.sentiment,
        follow_up_needed: analysis.followUpNeeded,
        follow_up_note: analysis.followUpNote,
      },
    },
    { status: createdNew ? 201 : 200 }
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
  const direction = searchParams.get("direction")?.trim();
  const dateFrom = searchParams.get("date_from")?.trim();
  const dateTo = searchParams.get("date_to")?.trim();
  const search = searchParams.get("search")?.trim();

  const where: Record<string, unknown> = {};

  if (employee) where.employeeName = { contains: employee, mode: "insensitive" };
  if (outcome) where.outcome = outcome;
  if (leadSource) where.leadSource = leadSource;
  if (country) where.country = country;
  if (source && VALID_SOURCES.has(source)) where.source = source;
  if (direction === "incoming" || direction === "outgoing") where.direction = direction;

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

  let calls: any[];
  try {
    calls = await prisma.call.findMany({
      where,
      orderBy: { callDate: "desc" },
      take: 500,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("GET /api/calls fallback select:", message);
    calls = await prisma.call.findMany({
      where,
      orderBy: { callDate: "desc" },
      take: 500,
      select: {
        id: true,
        phone: true,
        country: true,
        callDate: true,
        durationSeconds: true,
        fileName: true,
        source: true,
        rawTranscript: true,
        employeeName: true,
        customerName: true,
        customerIntent: true,
        carModel: true,
        carColor: true,
        carBrand: true,
        outcome: true,
        reasonPurchased: true,
        reasonNotPurchased: true,
        leadSource: true,
        summary: true,
        sentiment: true,
        followUpNeeded: true,
        followUpNote: true,
        leadId: true,
        createdAt: true,
      },
    });
  }

  let employees: { employeeName: string | null }[];
  try {
    employees = await prisma.call.findMany({
      where: { employeeName: { not: null } },
      select: { employeeName: true },
      distinct: ["employeeName"],
      orderBy: { employeeName: "asc" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "employees query failed";
    console.error("GET /api/calls employees error:", message);
    return NextResponse.json({ error: "Server xatosi", detail: message }, { status: 500 });
  }

  return NextResponse.json({
    calls,
    filters: {
      employees: employees.map((e) => e.employeeName).filter(Boolean),
    },
  });
}
