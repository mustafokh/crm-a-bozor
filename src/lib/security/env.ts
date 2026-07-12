const INSECURE_JWT = "dev-insecure-secret";
const MIN_JWT_LENGTH = 32;
const MIN_API_KEY_LENGTH = 24;

/** Productionda majburiy xavfsizlik o'zgaruvchilarini tekshiradi. */
export function assertSecurityEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const jwt = process.env.JWT_SECRET;
  if (!jwt || jwt.length < MIN_JWT_LENGTH || jwt === INSECURE_JWT) {
    throw new Error(
      "JWT_SECRET productionda kamida 32 belgili kuchli random qiymat bo'lishi kerak"
    );
  }

  const apiKey = process.env.CRM_API_KEY;
  if (!apiKey || apiKey.length < MIN_API_KEY_LENGTH) {
    throw new Error(
      "CRM_API_KEY productionda kamida 24 belgili kuchli random qiymat bo'lishi kerak"
    );
  }
}

/** JWT imzo kaliti — productionda zaif fallback yo'q. */
export function getJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!raw || raw.length < MIN_JWT_LENGTH || raw === INSECURE_JWT) {
      throw new Error("JWT_SECRET not configured securely");
    }
    return new TextEncoder().encode(raw);
  }
  return new TextEncoder().encode(raw || INSECURE_JWT);
}
