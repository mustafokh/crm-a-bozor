"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { BrandLogo } from "@/components/brand-logo";
import { useI18n } from "@/components/language-provider";
import type { Permission } from "@/lib/rbac";

export function Sidebar({
  permissions,
  companyName,
  open,
  onClose,
}: {
  permissions: Permission[];
  companyName: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = NAV_ITEMS.filter((i) => permissions.includes(i.permission));
  const groups = Array.from(new Set(items.map((i) => i.groupKey)));

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground shadow-soft transition-transform lg:static lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-[76px] items-center justify-between gap-2 px-6">
          <BrandLogo size="md" href="/dashboard" />
          <button onClick={onClose} className="lg:hidden text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {t(group)}
              </p>
              <div className="space-y-1">
                {items
                  .filter((i) => i.groupKey === group)
                  .map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "group/nav flex items-center gap-3 rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-200",
                          active
                            ? "grad-dark text-white shadow-soft beam"
                            : "text-muted-foreground hover:bg-accent hover:text-brand-blue"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-secondary text-muted-foreground group-hover/nav:bg-brand-blue/10 group-hover/nav:text-brand-blue"
                          )}
                        >
                          <Icon className="h-[15px] w-[15px]" />
                        </span>
                        {t(item.labelKey)}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-6 py-4">
          <div className="grad-sweep h-1 w-full rounded-full opacity-70" />
          <p className="mt-3 text-[11px] font-medium text-muted-foreground">{companyName}</p>
        </div>
      </aside>
    </>
  );
}
