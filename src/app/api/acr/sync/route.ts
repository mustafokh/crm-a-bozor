import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-key-auth";

export const runtime = "nodejs";

/** Manual / cron trigger for Cube ACR Drive → Whisper → CRM. Header: X-API-Key */
export async function POST(req: Request) {
  const authError = verifyApiKey(req);
  if (authError) return authError;
  const { runAcrSyncOnce } = await import("@/lib/acr/sync");
  const result = await runAcrSyncOnce();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: Request) {
  return POST(req);
}
