import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "./constants";
import { getJwtSecret } from "./security/env";

const MAX_AGE = Number(process.env.SESSION_MAX_AGE || 604800);
export const SESSION_COOKIE = "avtosalon_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
}

function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("strict" as const) : ("lax" as const),
    maxAge: MAX_AGE,
    path: "/",
  };
}

/** Sign a JWT for the given user (edge-compatible via jose). */
export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getJwtSecret());
}

/** Verify a raw JWT string and return the payload, or null. */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      id: payload.id as string,
      name: payload.name as string,
      email: payload.email as string,
      role: payload.role as Role,
      avatar: (payload.avatar as string) ?? null,
    };
  } catch {
    return null;
  }
}

/** Read + verify the session from the request cookies (cached per request). */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
});

/** Set the session cookie. */
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
