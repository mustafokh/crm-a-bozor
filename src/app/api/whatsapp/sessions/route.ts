import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/api-auth";
import {
  isWhatsAppConfigured,
  listWaSessions,
  startWaSession,
} from "@/lib/whatsapp-service-client";

/** Xodimlar + WhatsApp session holati */
export async function GET() {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.user.findMany({
    where: { active: true, role: { in: ["ADMIN", "MANAGER"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, phone: true },
  });

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({
      configured: false,
      users,
      sessions: [],
      error: "WHATSAPP_SERVICE_URL sozlanmagan",
    });
  }

  try {
    const sessions = await listWaSessions();
    return NextResponse.json({ configured: true, users, sessions });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      configured: true,
      users,
      sessions: [],
      error: message,
    });
  }
}

/** Session yaratish / QR uchun ishga tushirish */
export async function POST(req: Request) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "WhatsApp service sozlanmagan" }, { status: 503 });
  }

  let body: { employeeId?: string; employeeName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }

  const employeeId = String(body.employeeId ?? "").trim();
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId talab qilinadi" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: employeeId, active: true, role: { in: ["ADMIN", "MANAGER"] } },
    select: { id: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Xodim topilmadi" }, { status: 404 });
  }

  try {
    const session = await startWaSession(user.id, body.employeeName?.trim() || user.name);
    return NextResponse.json({ ok: true, session }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
