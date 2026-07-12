"use client";

import { Globe } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/language-provider";
import { LOCALE_LABELS, LOCALE_SHORT, LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full bg-card px-3 py-2.5 text-xs font-semibold shadow-soft transition-transform hover:-translate-y-0.5"
        title={t("topbar.language")}
      >
        <Globe className="h-[16px] w-[16px] text-brand-blue" />
        {LOCALE_SHORT[locale]}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 min-w-[140px] rounded-2xl bg-popover p-1.5 shadow-lift animate-fade-in">
            {LOCALES.map((loc) => (
              <button
                key={loc}
                onClick={() => {
                  setLocale(loc as Locale);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors",
                  locale === loc
                    ? "bg-brand-blue/10 font-semibold text-brand-blue"
                    : "hover:bg-accent"
                )}
              >
                <span>{LOCALE_LABELS[loc as Locale]}</span>
                <span className="text-xs text-muted-foreground">{LOCALE_SHORT[loc as Locale]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
