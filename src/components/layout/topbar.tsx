"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, Moon, Sun, LogOut, Bell } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useI18n } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { initials } from "@/lib/utils";
import type { Role } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";

export function Topbar({
  user,
  onMenuClick,
  notifications = 0,
}: {
  user: SessionUser;
  onMenuClick: () => void;
  notifications?: number;
}) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between bg-background/80 px-4 backdrop-blur-md lg:px-8">
      <button
        onClick={onMenuClick}
        className="rounded-full bg-card p-2.5 shadow-soft lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2.5">
        <a
          href="/leads"
          className="relative rounded-full bg-card p-2.5 shadow-soft transition-transform hover:-translate-y-0.5"
          title={t("topbar.notifications")}
        >
          <Bell className="h-[18px] w-[18px]" />
          {notifications > 0 && (
            <span className="grad-warm absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
              {notifications}
            </span>
          )}
        </a>

        <LanguageSwitcher />

        <button
          onClick={toggle}
          className="rounded-full bg-card p-2.5 shadow-soft transition-transform hover:-translate-y-0.5"
          title={t("topbar.theme")}
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full bg-card py-1.5 pl-1.5 pr-4 shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <div className="grad-dark flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
              {initials(user.name)}
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[13px] font-semibold leading-tight">{user.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {t(`enum.role.${user.role as Role}`)}
              </div>
            </div>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-popover p-1.5 shadow-lift animate-fade-in">
                <div className="border-b border-border/60 px-3 py-2.5">
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                <button
                  onClick={logout}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  {t("topbar.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
