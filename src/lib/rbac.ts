import type { Role } from "./constants";

export type Permission =
  | "dashboard"
  | "inventory"
  | "incoming"
  | "customers"
  | "leads"
  | "calls"
  | "deals"
  | "contracts"
  | "finance"
  | "employees"
  | "reports"
  | "settings";

const ROLE_PERMISSIONS: Record<Role, Permission[] | "*"> = {
  ADMIN: "*",
  MANAGER: ["dashboard", "leads"],
  ACCOUNTANT: ["dashboard", "leads"],
  WAREHOUSE: ["dashboard", "leads"],
};

export function can(role: Role | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  if (perms === "*") return true;
  return perms.includes(permission);
}

export function permissionsFor(role: Role | string | undefined): Permission[] {
  const nav: Permission[] = ["dashboard", "leads", "calls", "settings"];
  return nav.filter((p) => can(role, p));
}

export const PATH_PERMISSIONS: { prefix: string; permission: Permission }[] = [
  { prefix: "/leads", permission: "leads" },
  { prefix: "/calls", permission: "calls" },
  { prefix: "/dashboard", permission: "dashboard" },
  { prefix: "/settings", permission: "settings" },
  { prefix: "/inventory", permission: "leads" },
  { prefix: "/incoming", permission: "leads" },
  { prefix: "/customers", permission: "leads" },
  { prefix: "/deals", permission: "leads" },
  { prefix: "/contracts", permission: "leads" },
  { prefix: "/finance", permission: "leads" },
  { prefix: "/employees", permission: "leads" },
  { prefix: "/reports", permission: "leads" },
];
