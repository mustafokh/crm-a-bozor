import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("deals");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const updated = await prisma.deal.update({
    where: { id },
    data: { status: body.status ?? deal.status },
  });

  // Keep the contract status in sync; restore car if cancelled.
  if (body.status) {
    await prisma.contract.updateMany({ where: { dealId: id }, data: { status: body.status } });
    if (body.status === "CANCELLED") {
      await prisma.car.update({ where: { id: deal.carId }, data: { status: "IN_STOCK" } });
    }
    await logActivity({
      userId: auth.id,
      action: "STATUS_CHANGE",
      entityType: "Deal",
      entityId: id,
      description: `${auth.name} savdo statusini o'zgartirdi: ${body.status}`,
    });
  }
  return NextResponse.json({ deal: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only admins can delete deals (destructive).
  const auth = await requirePermission("deals");
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Faqat admin o'chira oladi" }, { status: 403 });
  }
  const { id } = await params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  await prisma.deal.delete({ where: { id } });
  await prisma.car.update({ where: { id: deal.carId }, data: { status: "IN_STOCK" } });
  await logActivity({
    userId: auth.id,
    action: "DELETE",
    entityType: "Deal",
    entityId: id,
    description: `${auth.name} savdoni o'chirdi`,
  });
  return NextResponse.json({ ok: true });
}
