import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { getWaQrPng } from "@/lib/whatsapp-service-client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const auth = await requirePermission("settings");
  if (auth instanceof NextResponse) return auth;
  const { employeeId } = await params;

  try {
    const png = await getWaQrPng(employeeId);
    if (!png) {
      return NextResponse.json({ error: "QR yo'q — ulanishni kuting yoki allaqachon ulangan" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
