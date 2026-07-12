import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createToken, setSessionCookie } from "@/lib/auth";
import { logActivity } from "@/lib/api-auth";
import type { Role } from "@/lib/constants";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email va parol kiriting" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) {
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  const token = await createToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatar: user.avatar,
  });
  await setSessionCookie(token);
  await logActivity({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    description: `${user.name} tizimga kirdi`,
  });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
