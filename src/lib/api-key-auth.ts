import { NextResponse } from "next/server";
import { timingSafeEqual } from "./security/crypto";

/** X-API-Key header ni CRM_API_KEY bilan xavfsiz solishtiradi. */
export function verifyApiKey(req: Request): NextResponse | null {
  const expected = process.env.CRM_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "CRM_API_KEY sozlanmagan" },
      { status: 503 }
    );
  }

  const provided = req.headers.get("x-api-key");
  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Noto'g'ri yoki yo'q API kalit" }, { status: 401 });
  }

  return null;
}
