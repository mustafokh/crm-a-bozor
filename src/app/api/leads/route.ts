import { CALLS_HISTORY_INCLUDE, withLatestCall } from "@/lib/calls/latest-call";
import { detectCountryFromPhone } from "@/lib/country-display";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { validateLead, hasErrors } from "@/lib/validation";
import { extractTalkFields, hasTalkContent } from "@/lib/lead-helpers";

function managerWhere(auth: { id: string; role: string }) {
  return auth.role === "MANAGER"
    ? { OR: [{ assignedToId: auth.id }, { assignedToId: null }] }
    : {};
}

const leadInclude = {
  assignedTo: { select: { id: true, name: true } },
  conversations: {
    orderBy: { talkedAt: "desc" as const },
    include: { user: { select: { id: true, name: true } } },
  },
  calls: CALLS_HISTORY_INCLUDE,
};

export async function GET() {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;

  const leads = await prisma.lead.findMany({
    where: managerWhere(auth),
    orderBy: [{ talkedAt: "desc" }, { createdAt: "desc" }],
    include: {
      assignedTo: { select: { id: true, name: true } },
      conversations: {
        orderBy: { talkedAt: "desc" },
        take: 10,
        include: { user: { select: { id: true, name: true } } },
      },
      calls: CALLS_HISTORY_INCLUDE,
      _count: { select: { conversations: true } },
    },
  });
  return NextResponse.json({ leads: leads.map(withLatestCall) });
}

export async function POST(req: Request) {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();
  const fields = validateLead({ fullName: body.fullName, phone: body.phone });
  if (hasErrors(fields)) {
    return NextResponse.json({ error: "Ma'lumotlarni tekshiring", fields }, { status: 400 });
  }

  const talkedAt = body.talkedAt ? new Date(body.talkedAt) : null;
  const assignedToId = body.assignedToId || auth.id;
  const talk = extractTalkFields(body);

  const lead = await prisma.lead.create({
    data: {
      fullName: body.fullName,
      phone: body.phone,
      country: body.country || detectCountryFromPhone(String(body.phone)) || null,
      source: body.source || "OTHER",
      status: body.status || "NEW",
      notes: body.notes || null,
      followUpAt: body.followUpAt ? new Date(body.followUpAt) : null,
      assignedToId,
      talkedAt,
      ...talk,
      conversations: hasTalkContent(talk, talkedAt)
        ? {
            create: {
              userId: auth.id,
              talkedAt: talkedAt ?? new Date(),
              ...talk,
            },
          }
        : undefined,
    },
    include: leadInclude,
  });

  await logActivity({
    userId: auth.id,
    action: "CREATE",
    entityType: "Lead",
    entityId: lead.id,
    description: `${auth.name} yangi lid qo'shdi: ${lead.fullName}`,
  });
  return NextResponse.json({ lead: withLatestCall(lead) });
}
