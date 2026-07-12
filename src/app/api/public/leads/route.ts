import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateLead, hasErrors } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { logActivity } from "@/lib/api-auth";
import { extractTalkFields } from "@/lib/lead-helpers";

const VALID_SOURCES = ["WEBSITE", "INSTAGRAM", "TELEGRAM", "CALL", "REFERRAL", "OTHER"];
const MAX_BODY_BYTES = 16_384;

/** Public lead application — no auth required. */
export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "So'rov hajmi juda katta" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }

  // Honeypot — botlar to'ldirsa, muvaffaqiyat ko'rinishida rad etamiz
  if (body._hp || body.website || body.url) {
    return NextResponse.json({ ok: true, id: "accepted" }, { status: 201 });
  }

  const fields = validateLead({
    fullName: body.fullName as string | undefined,
    phone: body.phone as string | undefined,
  });
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const source = VALID_SOURCES.includes(String(body.source)) ? String(body.source) : "WEBSITE";
  const talk = extractTalkFields(body);

  const noteParts: string[] = [];
  if (body.message && String(body.message).trim()) noteParts.push(String(body.message).trim());

  const lead = await prisma.lead.create({
    data: {
      fullName: String(body.fullName).trim(),
      phone: normalizePhone(String(body.phone)),
      country: body.country ? String(body.country).trim() : null,
      source,
      status: "NEW",
      notes: noteParts.length ? noteParts.join("\n") : null,
      ...talk,
      assignedToId: null,
      followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await logActivity({
    action: "CREATE",
    entityType: "Lead",
    entityId: lead.id,
    description: `Onlayn ariza: ${lead.fullName} (${source})`,
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
