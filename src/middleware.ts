import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { PATH_PERMISSIONS, can } from "./lib/rbac";
import { SESSION_COOKIE } from "./lib/auth";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-insecure-secret"
);

const PUBLIC_PATHS = ["/login", "/apply", "/showroom"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets, api/auth, public API and public paths through.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/uploads") ||
    pathname.includes(".") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // API routes handle their own auth — skip duplicate JWT verify here.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let role: string | undefined;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      role = payload.role as string;
    } catch {
      role = undefined;
    }
  }

  // Not authenticated → redirect to login (except API which returns 401).
  if (!role) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Root → bosh sahifa
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Eski modullardan lidlar sahifasiga
  const LEGACY_PATHS = [
    "/inventory", "/incoming", "/customers", "/deals",
    "/contracts", "/finance", "/employees", "/reports",
  ];
  if (LEGACY_PATHS.some((p) => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/leads";
    return NextResponse.redirect(url);
  }

  // Role-based path protection (only for page routes; APIs enforce their own).
  const match = PATH_PERMISSIONS.find((p) => pathname.startsWith(p.prefix));
  if (match && !can(role, match.permission)) {
    const url = req.nextUrl.clone();
    url.pathname = "/leads";
    url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
