import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-key-auth";

export const runtime = "nodejs";

/** ACR poller status. Header: X-API-Key */
export async function GET(req: Request) {
  const { getAcrStatus } = await import("@/lib/acr/sync");
  const authError = verifyApiKey(req);
  if (authError) return authError;
  return NextResponse.json(getAcrStatus(), { status: 200 });
}
