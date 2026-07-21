import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { LEAD_STATUS } from "@/lib/constants";
import { detectCountryFromPhone } from "@/lib/country-display";
import { extractTalkFields } from "@/lib/lead-helpers";
import { CALLS_HISTORY_INCLUDE, withLatestCall } from "@/lib/calls/latest-call";
import { INTERACTIONS_INCLUDE, normalizeInteraction } from "@/lib/calls/interaction-helpers";

const leadInclude = {
  assignedTo: { select: { id: true, name: true } },
  conversations: {
    orderBy: { talkedAt: "desc" as const },
    include: { user: { select: { id: true, name: true } } },
  },
  calls: CALLS_HISTORY_INCLUDE,
  interactions: INTERACTIONS_INCLUDE,
  _count: { select: { conversations: true } },
};

function withInteractions(lead: ReturnType<typeof withLatestCall> & {
  interactions?: Parameters<typeof normalizeInteraction>[0][];
}) {
  const interactions = (lead.interactions ?? []).map(normalizeInteraction);
  return { ...lead, interactions };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: leadInclude,
  });
  if (!lead) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json({ lead: withInteractions(withLatestCall(lead)) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.fullName !== undefined) data.fullName = body.fullName;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.country !== undefined) {
    data.country = body.country || null;
  } else if (body.phone !== undefined) {
    data.country = detectCountryFromPhone(String(body.phone)) || existing.country;
  }
  if (body.source !== undefined) data.source = body.source;
  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.followUpAt !== undefined)
    data.followUpAt = body.followUpAt ? new Date(body.followUpAt) : null;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.talkedAt !== undefined)
    data.talkedAt = body.talkedAt ? new Date(body.talkedAt) : null;

  const talkKeys = [
    "carMake", "carModel", "carYear", "carColor", "carInterest",
    "budget", "paymentType", "clientWants", "discussionNotes", "outcome",
  ] as const;
  if (talkKeys.some((k) => body[k] !== undefined)) {
    Object.assign(data, extractTalkFields({ ...existing, ...body }));
  }

  const lead = await prisma.lead.update({
    where: { id },
    data,
    include: leadInclude,
  });

  if (body.status && body.status !== existing.status) {
    await logActivity({
      userId: auth.id,
      action: "STATUS_CHANGE",
      entityType: "Lead",
      entityId: id,
      description: `${lead.fullName} lidi "${LEAD_STATUS[body.status] ?? body.status}" holatiga o'tdi`,
    });
  }
  return NextResponse.json({ lead: withInteractions(withLatestCall(lead)) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
