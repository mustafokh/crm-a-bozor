import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { getWaSession, stopWaSession } from "@/lib/whatsapp-service-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const { employeeId } = await params;

  try {
    const session = await getWaSession(employeeId);
    if (!session) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    return NextResponse.json({ session });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const { employeeId } = await params;
  const { searchParams } = new URL(req.url);
  const clearAuth = searchParams.get("clear") !== "false";

  try {
    await stopWaSession(employeeId, clearAuth);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
