import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "./auth";
import { can, type Permission } from "./rbac";
import { prisma } from "./prisma";

/** Return the session or a 401 response. Usage: const s = await requireAuth(); if (s instanceof NextResponse) return s; */
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }
  return session;
}

/** Require a specific permission; returns session or a 401/403 response. */
export async function requirePermission(
  permission: Permission
): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Avtorizatsiya talab qilinadi" }, { status: 401 });
  }
  if (!can(session.role, permission)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
  return session;
}

/** Write an audit/activity log entry. Fails silently to not break main flow. */
export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  customerId?: string | null;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        description: params.description,
        customerId: params.customerId ?? null,
      },
    });
  } catch (e) {
    console.error("logActivity failed", e);
  }
}
