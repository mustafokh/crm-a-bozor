import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { submitTgPhone } from "@/lib/telegram-service-client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const { employeeId } = await params;

  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }

  const phone = String(body.phone ?? "").trim();
  if (!phone) {
    return NextResponse.json({ error: "Telefon talab qilinadi" }, { status: 400 });
  }

  try {
    const session = await submitTgPhone(employeeId, phone);
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
