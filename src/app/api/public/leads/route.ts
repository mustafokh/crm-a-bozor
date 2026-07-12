import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateLead, hasErrors } from "@/lib/validation";
import { normalizePhone } from "@/lib/phone";
import { logActivity } from "@/lib/api-auth";
import { extractTalkFields } from "@/lib/lead-helpers";

const VALID_SOURCES = ["WEBSITE", "INSTAGRAM", "TELEGRAM", "CALL", "REFERRAL", "OTHER"];

/** Public lead application — no auth required. */
export async function POST(req: Request) {
  const body = await req.json();

  const fields = validateLead({
    fullName: body.fullName,
    phone: body.phone,
  });
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const source = VALID_SOURCES.includes(body.source) ? body.source : "WEBSITE";
  const talk = extractTalkFields(body);

  const noteParts: string[] = [];
  if (body.message?.trim()) noteParts.push(String(body.message).trim());

  const lead = await prisma.lead.create({
    data: {
      fullName: String(body.fullName).trim(),
      phone: normalizePhone(String(body.phone)),
      country: body.country?.trim() || null,
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
