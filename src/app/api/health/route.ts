import { NextResponse } from "next/server";

/** Public liveness for Azure warmup / probes. No secrets. */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "mkus-crm",
      acr_sync_enabled: (process.env.ACR_SYNC_ENABLED || "").toLowerCase() === "true",
      whisper_language: process.env.WHISPER_LANGUAGE || "en",
    },
    { status: 200 }
  );
}
