"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Phone, MessageCircle, Send, Users, Car, ChevronRight, TrendingUp, Globe, Palette,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { leadOutcomeLabel } from "@/lib/lead-helpers";
import { LEAD_SOURCE } from "@/lib/constants";
import { CountUp } from "@/components/count-up";
import { DualLine, BarsChart, DonutChart } from "@/components/charts";
import { CarColorBadge } from "@/components/ui/car-color-badge";
import { CountryBadge } from "@/components/ui/country-badge";
import { resolveCarColor } from "@/lib/car-color";
import type { LucideIcon } from "lucide-react";

export interface DashboardAnalytics {
  bySource: { source: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byOutcome: { outcome: string; count: number }[];
  byColor: { color: string; count: number }[];
  todayByChannel: { source: string; count: number }[];
  todayCallsTotal: number;
  todayLeadTalks: number;
  todayTalks: number;
  topTodayChannel?: { source: string; count: number };
  todayByEmployee: { id: string | null; name: string; count: number }[];
  topCarInterests: { label: string; carColor: string | null; carModel: string | null; count: number }[];
  todayCarInterests: { label: string; carColor: string | null; carModel: string | null; count: number }[];
  weeklyTrend?: {
    name: string;
    CALL: number;
    WHATSAPP: number;
    TELEGRAM: number;
    talks: number;
    total: number;
  }[];
}

const CHANNEL_STYLE: Record<string, { icon: LucideIcon; color: string; hex: string; bg: string }> = {
  CALL: { icon: Phone, color: "text-blue-800", hex: "#1D4ED8", bg: "from-blue-600 to-blue-800" },
  WHATSAPP: { icon: MessageCircle, color: "text-green-800", hex: "#16A34A", bg: "from-green-500 to-green-700" },
  TELEGRAM: { icon: Send, color: "text-sky-800", hex: "#229ED9", bg: "from-sky-400 to-sky-600" },
};

function filterHref(params: Record<string, string>) {
  return `/leads?${new URLSearchParams(params).toString()}`;
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function carBarName(c: { label: string; carColor: string | null }) {
  const en = resolveCarColor(c.carColor)?.labelEn;
  const model = c.label !== "—" ? c.label : "";
  if (en && model) return `${en} ${model}`;
  if (en) return en;
  return model || "—";
}

/** Animatsiyali ring foizi */
function PercentRing({
  percent,
  color,
  size = 88,
  delay = 0,
}: {
  percent: number;
  color: string;
  size?: number;
  delay?: number;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clamped / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/25" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)",
            transitionDelay: `${delay}ms`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums text-white">
          <CountUp value={clamped} duration={1000} />%
        </span>
      </div>
    </div>
  );
}

export function HomeAnalyticsSection({ stats }: { stats: DashboardAnalytics }) {
  const { t } = useI18n();

  const channelTotal = useMemo(
    () => stats.bySource.reduce((s, r) => s + r.count, 0),
    [stats.bySource]
  );
  const todayTotal = useMemo(
    () => stats.todayByChannel.reduce((s, r) => s + r.count, 0) || stats.todayTalks,
    [stats.todayByChannel, stats.todayTalks]
  );
  const colorTotal = useMemo(
    () => (stats.byColor ?? []).reduce((s, r) => s + r.count, 0),
    [stats.byColor]
  );
  const countryTotal = useMemo(
    () => (stats.byCountry ?? []).reduce((s, r) => s + r.count, 0),
    [stats.byCountry]
  );

  const donutData = stats.bySource
    .filter((r) => r.count > 0)
    .map((r) => ({ name: LEAD_SOURCE[r.source] ?? r.source, value: r.count }));

  const employeeBars = stats.todayByEmployee.slice(0, 6).map((e) => ({
    name: e.name.split(" ")[0] ?? e.name,
    value: e.count,
  }));

  const carRows = (stats.todayCarInterests.length > 0 ? stats.todayCarInterests : stats.topCarInterests).slice(0, 6);
  const carBars = carRows.map((c) => {
    const full = carBarName(c);
    return {
      name: full.length > 16 ? `${full.slice(0, 14)}…` : full,
      value: c.count,
      full,
      color: c.carColor,
      model: c.carModel,
      label: c.label,
    };
  });

  const week = stats.weeklyTrend ?? [];
  const topToday = stats.topTodayChannel;
  const topChannelName = topToday?.source ? LEAD_SOURCE[topToday.source] : null;
  const byColor = stats.byColor ?? [];
  const byCountry = stats.byCountry ?? [];
  const byOutcome = stats.byOutcome ?? [];

  return (
    <div className="space-y-6">
      {/* Bugungi KPI rings */}
      <section className="fade-up rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-5 text-white shadow-soft sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{t("home.analytics.todayTitle")}</h2>
            <p className="mt-1 text-sm text-white/70">{t("home.analytics.todaySubtitle")}</p>
          </div>
          {topToday && topToday.count > 0 && topChannelName && (
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              {t("home.analytics.topChannelLabel", { channel: topChannelName, count: String(topToday.count) })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link
            href="/leads?today=1"
            className="group flex flex-col items-center rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 p-4 shadow-lg transition-transform hover:-translate-y-1"
          >
            <PercentRing percent={100} color="#E9D5FF" delay={0} />
            <p className="mt-2 text-3xl font-bold tabular-nums">
              <CountUp value={stats.todayTalks} />
            </p>
            <p className="text-center text-xs font-medium text-violet-100">{t("home.analytics.todayTotal")}</p>
          </Link>

          {stats.todayByChannel.map((row, i) => {
            const style = CHANNEL_STYLE[row.source];
            if (!style) return null;
            const Icon = style.icon;
            const share = pct(row.count, todayTotal);
            return (
              <Link
                key={row.source}
                href={filterHref({ source: row.source, today: "1" })}
                className={cn(
                  "group flex flex-col items-center rounded-2xl bg-gradient-to-br p-4 shadow-lg transition-transform hover:-translate-y-1",
                  style.bg
                )}
              >
                <PercentRing percent={share || (row.count > 0 ? 100 : 0)} color="#fff" delay={80 * (i + 1)} />
                <div className="mt-2 flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-white/90" />
                  <p className="text-2xl font-bold tabular-nums">
                    <CountUp value={row.count} />
                  </p>
                </div>
                <p className="text-center text-xs font-semibold text-white/95">
                  {LEAD_SOURCE[row.source]} · {share}%
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Diagrammalar */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft xl:col-span-2" style={{ animationDelay: "80ms" }}>
          <h3 className="mb-1 font-semibold">{t("home.analytics.weekTrend")}</h3>
          <p className="mb-3 text-sm text-muted-foreground">{t("home.analytics.weekTrendDesc")}</p>
          {week.length > 0 ? (
            <DualLine
              data={week}
              height={260}
              keys={[
                { key: "CALL", color: "#1D4ED8", label: LEAD_SOURCE.CALL },
                { key: "WHATSAPP", color: "#16A34A", label: LEAD_SOURCE.WHATSAPP },
                { key: "TELEGRAM", color: "#229ED9", label: LEAD_SOURCE.TELEGRAM },
              ]}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("home.analytics.noDataToday")}</p>
          )}
        </section>

        <section className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "120ms" }}>
          <h3 className="mb-1 font-semibold">{t("home.analytics.channelShare")}</h3>
          <p className="mb-2 text-sm text-muted-foreground">{t("home.analytics.channelShareDesc")}</p>
          {donutData.length > 0 ? (
            <>
              <DonutChart
                data={donutData}
                colors={["#1D4ED8", "#16A34A", "#229ED9"]}
                height={200}
              />
              <div className="mt-2 space-y-2">
                {stats.bySource.map((row) => {
                  const share = pct(row.count, channelTotal);
                  const style = CHANNEL_STYLE[row.source];
                  return (
                    <Link
                      key={row.source}
                      href={filterHref({ source: row.source })}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: style?.hex }} />
                      <span className="flex-1 text-sm">{LEAD_SOURCE[row.source]}</span>
                      <span className="text-sm font-bold tabular-nums">{share}%</span>
                      <span className="text-xs text-muted-foreground">({row.count})</span>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("home.analytics.noDataToday")}</p>
          )}
        </section>
      </div>

      {/* Rang + davlat */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "140ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <Palette className="h-5 w-5 text-rose-600" />
            <h3 className="font-semibold">{t("home.analytics.topColors")}</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{t("home.analytics.topColorsDesc")}</p>
          {byColor.length > 0 ? (
            <div className="space-y-2">
              {byColor.slice(0, 8).map((row) => {
                const share = pct(row.count, colorTotal);
                return (
                  <Link
                    key={row.color}
                    href={filterHref({ color: row.color })}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 transition hover:border-rose-300 hover:bg-rose-50/50"
                  >
                    <CarColorBadge color={row.color} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(share, 4)}%`,
                            backgroundColor: resolveCarColor(row.color)?.hex ?? "#64748B",
                          }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {row.count} · {share}%
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("home.analytics.noCarData")}</p>
          )}
        </section>

        <section className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "160ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-600" />
            <h3 className="font-semibold">{t("home.analytics.byCountry")}</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{t("home.analytics.byCountryDesc")}</p>
          {byCountry.length > 0 ? (
            <div className="space-y-2">
              {byCountry.slice(0, 8).map((row) => {
                const share = pct(row.count, countryTotal);
                return (
                  <Link
                    key={row.country}
                    href={filterHref({ country: row.country })}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 transition hover:border-cyan-300 hover:bg-cyan-50/50"
                  >
                    <CountryBadge country={row.country} />
                    <span className="text-sm font-bold tabular-nums">
                      {row.count} · {share}%
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("home.analytics.noDataToday")}</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "160ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold">{t("home.analytics.todayEmployees")}</h3>
            </div>
            <Link href="/leads?today=1" className="text-xs font-medium text-primary hover:underline">
              {t("home.open")} <ChevronRight className="inline h-3 w-3" />
            </Link>
          </div>
          {employeeBars.length > 0 ? (
            <>
              <BarsChart data={employeeBars} dataKey="value" color="#4F46E5" height={220} />
              <div className="mt-3 space-y-1">
                {stats.todayByEmployee.slice(0, 5).map((e) => {
                  const share = pct(e.count, stats.todayByEmployee.reduce((s, x) => s + x.count, 0));
                  return (
                    <Link
                      key={`${e.name}-${e.count}`}
                      href={e.id ? filterHref({ employee: e.id, today: "1" }) : "/leads?today=1"}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-secondary"
                    >
                      <span className="truncate text-muted-foreground">{e.name}</span>
                      <span className="font-semibold tabular-nums">
                        {e.count} · {share}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("home.analytics.noDataToday")}</p>
          )}
        </section>

        <section className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "200ms" }}>
          <div className="mb-3 flex items-center gap-2">
            <Car className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold">{t("home.analytics.carInterests")}</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{t("home.analytics.carInterestsDesc")}</p>
          {carBars.length > 0 ? (
            <>
              <BarsChart data={carBars} dataKey="value" color="#D97706" height={200} />
              <div className="mt-3 space-y-2">
                {carBars.map((c) => (
                  <Link
                    key={`${c.color ?? ""}-${c.full}`}
                    href={filterHref({
                      ...(c.color ? { color: c.color } : {}),
                      ...(c.model ? { car: c.model } : c.label && c.label !== "—" ? { car: c.label } : {}),
                    })}
                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950 transition hover:bg-amber-100"
                  >
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      {c.color ? <CarColorBadge color={c.color} size="lg" /> : null}
                      <span className="truncate font-semibold">
                        {c.label !== "—" ? c.label : c.model || t("home.analytics.colorOnly")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-bold tabular-nums">
                      {c.value}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("home.analytics.noCarData")}</p>
          )}
        </section>
      </div>

      {/* Natijalar */}
      {byOutcome.length > 0 && (
        <section className="fade-up rounded-3xl border border-border bg-card p-5 shadow-soft" style={{ animationDelay: "220ms" }}>
          <h3 className="mb-3 font-semibold">{t("home.analytics.byOutcome")}</h3>
          <div className="flex flex-wrap gap-2">
            {byOutcome.map((o) => (
              <Link
                key={o.outcome}
                href={filterHref({ outcome: o.outcome })}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm transition hover:border-primary/40 hover:bg-primary/5"
              >
                <span>{leadOutcomeLabel(t, o.outcome)}</span>
                <span className="font-bold tabular-nums">{o.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Jami kanallar */}
      <section className="fade-up" style={{ animationDelay: "240ms" }}>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("home.analytics.allTimeTitle")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.bySource.map((row) => {
            const style = CHANNEL_STYLE[row.source];
            if (!style) return null;
            const Icon = style.icon;
            const share = pct(row.count, channelTotal);
            return (
              <Link
                key={row.source}
                href={filterHref({ source: row.source })}
                className={cn(
                  "flex items-center justify-between rounded-2xl bg-gradient-to-r p-4 text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg",
                  style.bg
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6" />
                  <div>
                    <p className="font-bold">{LEAD_SOURCE[row.source]}</p>
                    <p className="text-xs text-white/85">{share}% {t("home.analytics.ofAll")}</p>
                  </div>
                </div>
                <span className="text-3xl font-bold tabular-nums">
                  <CountUp value={row.count} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
