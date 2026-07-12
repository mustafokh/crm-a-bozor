import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, logActivity } from "@/lib/api-auth";
import { hashPassword, validatePasswordPolicy } from "@/lib/password";
import { canAssignRole, defaultRole, isValidRole } from "@/lib/security/roles";
import type { Role } from "@/lib/constants";

export async function GET() {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true, role: true, phone: true,
      active: true, commissionRate: true, createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const body = await req.json();

  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: "Ism, email va parol majburiy" }, { status: 400 });
  }

  const passwordError = validatePasswordPolicy(String(body.password));
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const targetRole: Role = isValidRole(body.role) ? body.role : defaultRole();
  if (!canAssignRole(auth.role as Role, targetRole)) {
    return NextResponse.json({ error: "Bu rolni tayinlashga ruxsat yo'q" }, { status: 403 });
  }

  const exists = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (exists) return NextResponse.json({ error: "Bu email band" }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      role: targetRole,
      phone: body.phone || null,
      commissionRate: Number(body.commissionRate) || 0,
    },
    select: { id: true, name: true, email: true, role: true },
  });
  await logActivity({
    userId: auth.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    description: `${auth.name} yangi foydalanuvchi qo'shdi: ${user.name}`,
  });
  return NextResponse.json({ user });
}
