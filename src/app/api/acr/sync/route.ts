import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-key-auth";
import { runAcrSyncOnce } from "@/lib/acr/sync";

/** Manual / cron trigger for Cube ACR Drive → Whisper → CRM. Header: X-API-Key */
export async function POST(req: Request) {
  const authError = verifyApiKey(req);
  if (authError) return authError;
  const result = await runAcrSyncOnce();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET(req: Request) {
  return POST(req);
}
