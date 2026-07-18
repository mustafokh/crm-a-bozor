import {
  LayoutDashboard,
  Filter,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "./rbac";

export interface NavItem {
  labelKey: string;
  groupKey: string;
  href: string;
  icon: LucideIcon;
  permission: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.dashboard", groupKey: "nav.group.general", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { labelKey: "nav.leads", groupKey: "nav.group.general", href: "/leads", icon: Filter, permission: "leads" },
  { labelKey: "nav.employees", groupKey: "nav.group.general", href: "/employees", icon: Users, permission: "settings" },
  { labelKey: "nav.settings", groupKey: "nav.group.management", href: "/settings", icon: Settings, permission: "settings" },
];
