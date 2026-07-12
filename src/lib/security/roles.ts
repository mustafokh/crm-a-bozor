import type { Role } from "@/lib/constants";

const VALID_ROLES: Role[] = ["ADMIN", "MANAGER", "ACCOUNTANT", "WAREHOUSE"];

export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && VALID_ROLES.includes(value as Role);
}

/** Faqat ADMIN boshqa ADMIN yaratishi/tayinlashi mumkin. */
export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (targetRole === "ADMIN" && actorRole !== "ADMIN") return false;
  return isValidRole(targetRole);
}

export function defaultRole(): Role {
  return "MANAGER";
}
