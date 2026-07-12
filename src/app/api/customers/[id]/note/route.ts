import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";

// Add a customer interaction note (call / meeting / comment) to the activity log.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("customers");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const { text, kind } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Matn kiriting" }, { status: 400 });

  const label = kind === "CALL" ? "Qo'ng'iroq" : kind === "MEETING" ? "Uchrashuv" : "Eslatma";
  const log = await prisma.activityLog.create({
    data: {
      userId: auth.id,
      customerId: id,
      action: "NOTE",
      entityType: "Customer",
      entityId: id,
      description: `${label}: ${text.trim()}`,
    },
  });
  return NextResponse.json({ log });
}
