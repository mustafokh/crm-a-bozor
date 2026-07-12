"use client";

import { useEffect, useState, type ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatMoney } from "@/lib/utils";
import { CountUp } from "@/components/count-up";
import { useI18n } from "@/components/language-provider";

type Accent = "primary" | "success" | "warning" | "destructive";

// MKUS brand gradient pairs: red, blue, green, violet.
const ACCENT_GRAD: Record<Accent, [string, string]> = {
  warning: ["hsl(357 82% 51%)", "hsl(357 75% 58%)"],
  success: ["hsl(152 55% 42%)", "hsl(152 45% 62%)"],
  primary: ["hsl(217 82% 41%)", "hsl(217 75% 55%)"],
  destructive: ["hsl(357 82% 51%)", "hsl(14 90% 65%)"],
};

const R = 30;
const CIRC = 2 * Math.PI * R;

/**
 * Big-number stat card with a soft gradient progress ring — floating white
 * card, generous radius, calm hierarchy (Ron design language).
 */
export function GaugeStat({
  title,
  value,
  percent,
  icon,
  money,
  currency = "USD",
  hint,
  trend,
  accent = "primary",
  delay = 0,
}: {
  title: string;
  value: number;
  percent: number; // 0..100 — ring fill
  icon: ReactNode;
  money?: boolean;
  currency?: string;
  hint?: string;
  trend?: { value: number; positive: boolean };
  accent?: Accent;
  delay?: number;
}) {
  const format = money
    ? (n: number) => formatMoney(n, currency, { compact: true })
    : undefined;
  const clamped = Math.max(0, Math.min(100, percent));
  const [offset, setOffset] = useState(CIRC);
  const { t } = useI18n();
  const [c1, c2] = ACCENT_GRAD[accent];
  const gradId = `ring-${accent}`;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = CIRC * (1 - clamped / 100);
    if (reduce) {
      setOffset(target);
      return;
    }
    const t = setTimeout(() => setOffset(target), 120 + delay);
    return () => clearTimeout(t);
  }, [clamped, delay]);

  return (
    <div
      className="fade-up group relative overflow-hidden rounded-3xl bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Soft gradient wash in the corner */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.09] blur-2xl transition-opacity group-hover:opacity-[0.16]"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      />

      <div className="flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-soft [&_svg]:h-5 [&_svg]:w-5"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        >
          {icon}
        </div>

        {/* Gradient progress ring */}
        <div className="relative h-[72px] w-[72px]">
          <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </linearGradient>
            </defs>
            <circle cx="36" cy="36" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r={R}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }}
            />
          </svg>
          <span className="tnum absolute inset-0 flex items-center justify-center text-[13px] font-bold">
            {Math.round(clamped)}%
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
        <div className="font-display mt-1.5 text-[30px] font-bold leading-none tracking-tight tnum">
          <CountUp value={value} format={format} />
        </div>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              trend.positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-muted-foreground">{t("common.thisMonth")}</span>
        </div>
      )}
    </div>
  );
}
