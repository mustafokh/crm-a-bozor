import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { canAssignRole, isValidRole } from "@/lib/security/roles";
import type { Role } from "@/lib/constants";

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
  if (body.role !== undefined) {
    if (!isValidRole(body.role)) {
      return NextResponse.json({ error: "Noto'g'ri rol" }, { status: 400 });
    }
    if (!canAssignRole(auth.role as Role, body.role)) {
      return NextResponse.json({ error: "Bu rolni tayinlashga ruxsat yo'q" }, { status: 403 });
    }
    data.role = body.role;
  }
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.active !== undefined) data.active = body.active;
  if (body.commissionRate !== undefined) data.commissionRate = Number(body.commissionRate);
  if (body.password) {
    const passwordError = validatePasswordPolicy(String(body.password));
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
  }

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
