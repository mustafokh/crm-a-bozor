import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyApiKey } from "@/lib/api-key-auth";
import { requirePermission } from "@/lib/api-auth";
import { normalizePhone, extractPhoneFromText } from "@/lib/phone";
import { detectCountryFromPhone } from "@/lib/calls/phone-country";
import { analyzeMessagingTranscript } from "@/lib/calls/analyze-messaging";
import { analyzeTranscript } from "@/lib/calls/analyze-transcript";
import { syncCallToLead, syncFilteredCall } from "@/lib/calls/sync-lead";
import { checkBusinessRelevance } from "@/lib/calls/check-business-relevance";
import { resolveCallDirection } from "@/lib/calls/call-direction";
import {
  formatTranscriptAsDialog,
  isAlreadyLabeledDialog,
} from "@/lib/calls/format-transcript";
import { inferTransmissionFromText } from "@/lib/calls/latest-call";
import {
  appendTranscriptLine,
  buildThreadFromCallRecords,
  labelMessage,
  resolveMessageDirection,
} from "@/lib/calls/messaging-thread";
import {
  getInteractionCallRecords,
  resolveInteraction,
} from "@/lib/calls/resolve-interaction";
import { syncInteractionFromAnalysis } from "@/lib/calls/sync-interaction";
import {
  enforceUnclearIfNeeded,
  isSuspiciousTranscript,
  unclearAnalysis,
} from "@/lib/calls/suspicious-transcript";
import { whisperFromAudioUrl } from "@/lib/calls/whisper-from-url";

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

/** Messaging kanallari — AI uchun oldingi xabar kontekstini o'qiydi (yozuvlarni birlashtirmaydi). */
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
  const col = column.toLowerCase();
  if (m.includes(col) && (m.includes("does not exist") || m.includes("unknown column"))) {
    return true;
  }
  // Prisma client eski bo'lsa — maydon schema'da yo'q
  if (m.includes("unknown arg") && m.includes(col)) return true;
  if (m.includes("invalid") && m.includes("invocation") && m.includes(col)) return true;
  return false;
}

function clipTranscript(text: string): string {
  if (text.length <= MAX_TRANSCRIPT_LEN) return text;
  let clipped = text.slice(-MAX_TRANSCRIPT_LEN);
  const nl = clipped.indexOf("\n");
  if (nl > 0 && nl < 400) clipped = clipped.slice(nl + 1);
  return clipped;
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
  let rawTranscript = String(body.raw_transcript ?? body.transcript ?? "").trim();
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

  // Phone calls: if audio_url present and transcript empty → Whisper (en) in CRM (laptop off)
  if (!rawTranscript && audioParsed.value && !audioParsed.error && sourceRaw === "call") {
    try {
      rawTranscript = await whisperFromAudioUrl(audioParsed.value);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("POST /api/calls whisper-from-url:", msg);
      return NextResponse.json(
        { error: "Whisper transkripsiya xatosi", detail: msg },
        { status: 502 }
      );
    }
  }

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

  // Xabar dedupe (file_name) — tarixni buzmasdan takroriy POST'ni o'tkazib yuborish
  if (fileName) {
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

  // Interaction (thread) aniqlash — mavjud lead bo'lsa
  const existingLead = await prisma.lead.findFirst({
    where: { phone },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  let interactionId: string | null = null;
  let interactionIsNew = false;

  const msgDir = THREAD_SOURCES.has(sourceRaw)
    ? resolveMessageDirection(body)
    : null;
  const labeledPreview = THREAD_SOURCES.has(sourceRaw)
    ? labelMessage(rawTranscript, msgDir ?? "inbound")
    : rawTranscript;

  const interactionResolution = await resolveInteraction({
    leadId: existingLead?.id ?? null,
    phone,
    source: sourceRaw,
    callDate: callDate!,
    newMessage: labeledPreview,
  }).catch((e) => {
    console.error("resolveInteraction failed:", e instanceof Error ? e.message : e);
    return null;
  });
  if (interactionResolution) {
    interactionId = interactionResolution.interactionId;
    interactionIsNew = interactionResolution.isNew;
  }

  // Persist qilinadigan matn: messaging uchun yorliqli yangi xabar; call uchun asl transcript
  // rawTranscript hech qachon formatlangan matn bilan yozilmaydi
  let persistedTranscript = rawTranscript;
  // AI ga yuboriladigan matn (faqat joriy interaction ichidagi call'lar)
  let transcriptForAnalysis = rawTranscript;
  let formattedTranscript: string | null = null;

  if (THREAD_SOURCES.has(sourceRaw)) {
    const labeledLine = labeledPreview;
    persistedTranscript = labeledLine;
    formattedTranscript = labeledLine;

    let previous: { rawTranscript: string; formattedTranscript?: string | null }[] = [];
    if (interactionId && !interactionIsNew) {
      try {
        previous = await getInteractionCallRecords(interactionId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!isMissingColumnError(msg, "interaction_id")) throw e;
        previous = await prisma.call.findMany({
          where: { phone, source: sourceRaw },
          orderBy: [{ callDate: "asc" }, { createdAt: "asc" }],
          take: 40,
          select: { rawTranscript: true, formattedTranscript: true },
        });
      }
    }

    if (previous.length > 0) {
      const history = buildThreadFromCallRecords(previous);
      transcriptForAnalysis = appendTranscriptLine(history, labeledLine);
    } else {
      transcriptForAnalysis = labeledLine;
    }

    transcriptForAnalysis = clipTranscript(transcriptForAnalysis);
  } else if (sourceRaw === "call" && interactionId && !interactionIsNew) {
    try {
      const previous = await getInteractionCallRecords(interactionId);
      if (previous.length > 0) {
        const history = buildThreadFromCallRecords(previous);
        transcriptForAnalysis = appendTranscriptLine(history, rawTranscript);
        transcriptForAnalysis = clipTranscript(transcriptForAnalysis);
      }
    } catch {
      // interaction_id ustuni yo'q bo'lsa — faqat joriy qo'ng'iroq
    }
  }

  const isMessaging = THREAD_SOURCES.has(sourceRaw);
  const suspicious = isMessaging
    ? false
    : isSuspiciousTranscript(persistedTranscript, durationSeconds);

  // Telefon qo'ng'iroqlari: tahlildan oldin dialog formatlash
  if (sourceRaw === "call" && !suspicious) {
    if (isAlreadyLabeledDialog(persistedTranscript)) {
      formattedTranscript = persistedTranscript;
    } else {
      try {
        formattedTranscript = await formatTranscriptAsDialog(persistedTranscript);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error("POST /api/calls formatTranscript failed:", message);
        formattedTranscript = null;
      }
    }
  }

  // Asosiy AI tahlili: formatted bo'lsa uni, aks holda raw/thread matnini ishlat
  if (formattedTranscript && sourceRaw === "call") {
    transcriptForAnalysis = formattedTranscript;
  }

  // Biznes-relevans tekshiruvi — har yangi xabar/qo'ng'iroqda BUTUN thread bo'yicha
  let businessRelevance: { is_business_related: boolean; reason: string };
  try {
    businessRelevance = await checkBusinessRelevance(transcriptForAnalysis, sourceRaw);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Business relevance xatosi";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const isBusinessRelated = businessRelevance.is_business_related;
  const filterReason = businessRelevance.reason;

  // Biznesga aloqasi yo'q — Call saqlash, Lead yaratmaslik/yashirish
  if (!isBusinessRelated) {
    const employeeOverride = String(body.employee_name ?? "").trim() || null;
    const filteredCallData: Parameters<typeof prisma.call.create>[0]["data"] = {
      phone,
      country,
      callDate: callDate!,
      durationSeconds,
      fileName,
      audioUrl: audioParsed.value,
      source: sourceRaw,
      direction: callDirection,
      rawTranscript: persistedTranscript,
      formattedTranscript,
      employeeName: employeeOverride,
      isBusinessRelated: false,
      filteredOut: true,
      businessFilterReason: filterReason,
      summary: filterReason,
      outcome: "filtered",
    };

    let callId: string;
    try {
      const call = await prisma.call.create({
        data: filteredCallData,
        select: { id: true },
      });
      callId = call.id;
    } catch (e) {
      const message = e instanceof Error ? e.message : "call.create failed";
      console.error("POST /api/calls filtered create error:", message);
      const retryData: Record<string, unknown> = { ...filteredCallData };
      if (isMissingColumnError(message, "is_business_related") || isMissingColumnError(message, "isBusinessRelated")) {
        delete retryData.isBusinessRelated;
        delete retryData.filteredOut;
        delete retryData.businessFilterReason;
      }
      if (isMissingColumnError(message, "audio_url") || isMissingColumnError(message, "audioUrl")) {
        delete retryData.audioUrl;
      }
      if (isMissingColumnError(message, "direction")) {
        delete retryData.direction;
      }
      if (
        isMissingColumnError(message, "formatted_transcript") ||
        isMissingColumnError(message, "formattedTranscript")
      ) {
        delete retryData.formattedTranscript;
      }
      try {
        const retryCall = await prisma.call.create({
          data: retryData as typeof filteredCallData,
          select: { id: true },
        });
        callId = retryCall.id;
      } catch (e2) {
        const message2 = e2 instanceof Error ? e2.message : "call persist retry failed";
        return NextResponse.json({ error: "Server xatosi", detail: message2 }, { status: 500 });
      }
    }

    let leadId: string | null = null;
    try {
      const lead = await syncFilteredCall({
        phone,
        country,
        callDate: callDate!,
        channelSource: sourceRaw,
        rawTranscript: persistedTranscript,
        callId,
        filterReason,
        employeeName: employeeOverride,
      });
      leadId = lead.manuallyPromoted ? lead.id : lead.isFiltered ? lead.id : null;
    } catch (e) {
      const message = e instanceof Error ? e.message : "syncFilteredCall failed";
      console.error("POST /api/calls filtered sync error:", message);
    }

    return NextResponse.json(
      {
        ok: true,
        id: callId,
        lead_id: leadId,
        filtered: true,
        is_business_related: false,
        business_filter_reason: filterReason,
        country,
        direction: callDirection,
      },
      { status: 201 }
    );
  }

  let analysis;
  try {
    if (isMessaging) {
      analysis = await analyzeMessagingTranscript(
        transcriptForAnalysis,
        persistedTranscript,
        String(body.employee_name ?? "").trim() || undefined
      );
    } else if (suspicious) {
      analysis = unclearAnalysis();
    } else {
      analysis = await analyzeTranscript(transcriptForAnalysis);
      analysis = enforceUnclearIfNeeded(analysis, false);
    }
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

  // AI null qaytarsa — matndan mexanika/avtomat ni qo‘shimcha qidiramiz (audio unclear emas)
  if (analysis.outcome !== "unclear" && !analysis.carTransmission) {
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
    rawTranscript: persistedTranscript,
    formattedTranscript,
    interactionId,
    isBusinessRelated: true,
    filteredOut: false,
    businessFilterReason: null,
    ...analysisFields,
  };

  let callId: string;

  try {
    const call = await prisma.call.create({
      data: callData,
      select: { id: true },
    });
    callId = call.id;
  } catch (e) {
    const message = e instanceof Error ? e.message : "call.create failed";
    console.error("POST /api/calls create error:", message);

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
    if (
      isMissingColumnError(message, "formatted_transcript") ||
      isMissingColumnError(message, "formattedTranscript")
    ) {
      delete retryData.formattedTranscript;
    }
    if (isMissingColumnError(message, "is_business_related") || isMissingColumnError(message, "isBusinessRelated")) {
      delete retryData.isBusinessRelated;
      delete retryData.filteredOut;
      delete retryData.businessFilterReason;
    }
    if (isMissingColumnError(message, "interaction_id") || isMissingColumnError(message, "interactionId")) {
      delete retryData.interactionId;
    }

    try {
      const retryCall = await prisma.call.create({
        data: retryData as typeof callData,
        select: { id: true },
      });
      callId = retryCall.id;
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
      rawTranscript: persistedTranscript,
      callId,
      clearFiltered: true,
      interactionId,
    });

    if (!interactionId) {
      const interaction = await prisma.interaction.create({
        data: {
          leadId: lead.id,
          source: sourceRaw,
          startedAt: callDate!,
          lastMessageAt: callDate!,
          status: "active",
        },
        select: { id: true },
      });
      interactionId = interaction.id;
      await prisma.$executeRaw`
        UPDATE calls SET interaction_id = ${interactionId} WHERE id = ${callId};
      `;
      await syncInteractionFromAnalysis({
        interactionId,
        callDate: callDate!,
        analysis,
        employeeName: analysis.employeeName,
      });
    } else {
      await prisma.$executeRaw`
        UPDATE calls SET interaction_id = ${interactionId} WHERE id = ${callId};
      `;
    }
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
      formatted_transcript: formattedTranscript,
      unclear: analysis.outcome === "unclear",
      is_business_related: true,
      filtered: false,
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
        formattedTranscript: true,
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
