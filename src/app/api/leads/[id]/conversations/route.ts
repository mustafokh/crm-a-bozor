import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { extractTalkFields } from "@/lib/lead-helpers";

/** Yangi gaplashuv qo'shish va lidning oxirgi ma'lumotlarini yangilash */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("leads");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const talkedAt = body.talkedAt ? new Date(body.talkedAt) : new Date();
  const talk = extractTalkFields(body);

  const [conversation, updatedLead] = await prisma.$transaction([
    prisma.leadConversation.create({
      data: {
        leadId: id,
        userId: auth.id,
        talkedAt,
        ...talk,
      },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.lead.update({
      where: { id },
      data: {
        talkedAt,
        ...talk,
        country: body.country ? String(body.country).trim() || lead.country : undefined,
        status: body.outcome ? "ACTIVE" : undefined,
        assignedToId: lead.assignedToId ?? auth.id,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        conversations: {
          orderBy: { talkedAt: "desc" },
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { conversations: true } },
      },
    }),
  ]);

  await logActivity({
    userId: auth.id,
    action: "UPDATE",
    entityType: "Lead",
    entityId: id,
    description: `${lead.fullName} bilan gaplashuv qayd etildi`,
  });

  return NextResponse.json({ conversation, lead: updatedLead });
}
