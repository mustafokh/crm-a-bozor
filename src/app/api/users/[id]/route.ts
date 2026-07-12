import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) data.role = body.role;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.active !== undefined) data.active = body.active;
  if (body.commissionRate !== undefined) data.commissionRate = Number(body.commissionRate);
  if (body.password) data.passwordHash = await hashPassword(body.password);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, commissionRate: true, phone: true },
  });
  await logActivity({
    userId: auth.id,
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    description: `${auth.name} foydalanuvchini tahrirladi: ${user.name}`,
  });
  return NextResponse.json({ user });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  if (id === auth.id) {
    return NextResponse.json({ error: "O'zingizni o'chira olmaysiz" }, { status: 400 });
  }
  // Deactivate instead of hard delete to preserve deal/commission history.
  const user = await prisma.user.update({ where: { id }, data: { active: false } });
  await logActivity({
    userId: auth.id,
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    description: `${auth.name} foydalanuvchini bloklab qo'ydi: ${user.name}`,
  });
  return NextResponse.json({ ok: true });
}
