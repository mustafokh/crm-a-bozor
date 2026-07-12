import { NextResponse } from "next/server";

/** X-API-Key header ni CRM_API_KEY bilan solishtiradi. */
export function verifyApiKey(req: Request): NextResponse | null {
  const expected = process.env.CRM_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "CRM_API_KEY sozlanmagan" },
      { status: 503 }
    );
  }

  const provided = req.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Noto'g'ri yoki yo'q API kalit" }, { status: 401 });
  }

  return null;
}
