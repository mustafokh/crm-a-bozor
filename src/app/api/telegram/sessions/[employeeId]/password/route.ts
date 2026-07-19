import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { submitTgPassword } from "@/lib/telegram-service-client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const { employeeId } = await params;

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }

  const password = String(body.password ?? "").trim();
  if (!password) {
    return NextResponse.json({ error: "Parol talab qilinadi" }, { status: 400 });
  }

  try {
    const session = await submitTgPassword(employeeId, password);
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
