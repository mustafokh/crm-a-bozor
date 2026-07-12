type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

/** Oddiy in-memory rate limiter (har bir server instansiyasi uchun alohida). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true };
}

/** Proxy/load balancer orqali kelgan haqiqiy IP. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Eski yozuvlarni vaqt-vaqti bilan tozalash (xotira oqimini oldini olish). */
export function pruneRateLimitStore(maxAgeMs = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt + maxAgeMs) store.delete(key);
  }
}
