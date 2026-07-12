import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PATH_PERMISSIONS, can } from "./lib/rbac";
import { SESSION_COOKIE } from "./lib/auth";
import { getJwtSecret } from "./lib/security/env";
import { clientIp, pruneRateLimitStore, rateLimit } from "./lib/security/rate-limit";
import { safeRedirectPath } from "./lib/security/safe-redirect";

const PUBLIC_PATHS = ["/login", "/apply", "/showroom"];

const RATE_LIMITS: { prefix: string; limit: number; windowMs: number }[] = [
  { prefix: "/api/auth/login", limit: 8, windowMs: 15 * 60 * 1000 },
  { prefix: "/api/public/leads", limit: 10, windowMs: 60 * 60 * 1000 },
  { prefix: "/api/calls", limit: 120, windowMs: 60 * 60 * 1000 },
];

function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return res;
}

function rateLimitResponse(retryAfterSec: number): NextResponse {
  return applySecurityHeaders(
    NextResponse.json(
      { error: "Juda ko'p so'rov. Keyinroq urinib ko'ring." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    )
  );
}

export async function middleware(req: NextRequest) {
  pruneRateLimitStore();
  const { pathname } = req.nextUrl;

  for (const rule of RATE_LIMITS) {
    if (pathname.startsWith(rule.prefix)) {
      const ip = clientIp(req);
      const result = rateLimit(`${rule.prefix}:${ip}`, rule.limit, rule.windowMs);
      if (!result.ok) return rateLimitResponse(result.retryAfterSec);
      break;
    }
  }

  // Allow static assets, api/auth, public API and public paths through.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // API routes handle their own auth — skip duplicate JWT verify here.
  if (pathname.startsWith("/api")) {
    return applySecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let role: string | undefined;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret());
      role = payload.role as string;
    } catch {
      role = undefined;
    }
  }

  // Not authenticated → redirect to login (except API which returns 401).
  if (!role) {
    if (pathname.startsWith("/api")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 })
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", safeRedirectPath(pathname));
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // Root → bosh sahifa
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // Eski modullardan lidlar sahifasiga
  const LEGACY_PATHS = [
    "/inventory", "/incoming", "/customers", "/deals",
    "/contracts", "/finance", "/employees", "/reports",
  ];
  if (LEGACY_PATHS.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/leads";
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // Role-based path protection (only for page routes; APIs enforce their own).
  const match = PATH_PERMISSIONS.find((p) => pathname.startsWith(p.prefix));
  if (match && !can(role, match.permission)) {
    const url = req.nextUrl.clone();
    url.pathname = "/leads";
    url.searchParams.set("denied", "1");
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
