"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/language-provider";
import { cn } from "@/lib/utils";

export function PublicShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: "apply" | "showroom";
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      {/* Soft top gradient */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-blue/[0.06] to-transparent" />

      <header className="sticky top-0 z-30 border-b border-border/50 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogo size="lg" href="/showroom" />
          <nav className="flex items-center gap-2">
            <Link
              href="/showroom"
              className={cn(
                "rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                active === "showroom"
                  ? "bg-brand-blue text-white shadow-soft"
                  : "bg-secondary/80 text-muted-foreground hover:text-foreground"
              )}
            >
              {t("public.showroom.title")}
            </Link>
            <Link
              href="/apply"
              className={cn(
                "rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                active === "apply"
                  ? "bg-brand-red text-white shadow-soft"
                  : "bg-secondary/80 text-muted-foreground hover:text-foreground"
              )}
            >
              {t("public.apply.title")}
            </Link>
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <main className="relative">{children}</main>

      <footer className="relative mt-12 border-t border-border/50 bg-card/60 py-10 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <BrandLogo size="md" href="/showroom" className="mx-auto justify-center" />
          <p className="mt-4 text-sm text-muted-foreground">
            © {new Date().getFullYear()} MKUS Avtosalon
          </p>
        </div>
      </footer>
    </div>
  );
}
