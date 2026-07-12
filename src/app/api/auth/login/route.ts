import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createToken, setSessionCookie } from "@/lib/auth";
import { logActivity } from "@/lib/api-auth";
import type { Role } from "@/lib/constants";

const MAX_BODY_BYTES = 4096;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "So'rov hajmi juda katta" }, { status: 413 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }

  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email va parol kiriting" }, { status: 400 });
  }
  if (password.length > 128) {
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user?.active && user.passwordHash
    ? await verifyPassword(password, user.passwordHash)
    : false;

  // Brute-force sekinlashtirish — muvaffaqiyatsiz urinishlarda qo'shimcha kechikish
  if (!ok) {
    await sleep(400 + Math.floor(Math.random() * 200));
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }

  const token = await createToken({
    id: user!.id,
    name: user!.name,
    email: user!.email,
    role: user!.role as Role,
    avatar: user!.avatar,
  });
  await setSessionCookie(token);
  await logActivity({
    userId: user!.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user!.id,
    description: `${user!.name} tizimga kirdi`,
  });

  return NextResponse.json({
    user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role },
  });
}
