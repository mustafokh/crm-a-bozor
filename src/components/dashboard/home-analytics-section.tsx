"use client";

import Link from "next/link";
import {
  Phone, MessageCircle, Send, Users, Car, ChevronRight, TrendingUp,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { LEAD_SOURCE } from "@/lib/constants";
import type { LucideIcon } from "lucide-react";

export interface DashboardAnalytics {
  bySource: { source: string; count: number }[];
  todayByChannel: { source: string; count: number }[];
  todayCallsTotal: number;
  todayLeadTalks: number;
  todayTalks: number;
  topTodayChannel?: { source: string; count: number };
  todayByEmployee: { id: string | null; name: string; count: number }[];
  topCarInterests: { label: string; carColor: string | null; carModel: string | null; count: number }[];
  todayCarInterests: { label: string; carColor: string | null; carModel: string | null; count: number }[];
}

const CHANNEL_META: Record<string, { icon: LucideIcon; card: string }> = {
  CALL: { icon: Phone, card: "border-l-[6px] border-l-blue-700 border-2 border-blue-600 bg-blue-100 text-blue-950 shadow-sm" },
  WHATSAPP: { icon: MessageCircle, card: "border-l-[6px] border-l-green-600 border-2 border-green-500 bg-green-100 text-green-950 shadow-sm" },
  TELEGRAM: { icon: Send, card: "border-l-[6px] border-l-[#229ED9] border-2 border-[#229ED9] bg-sky-100 text-sky-950 shadow-sm" },
};

function filterHref(params: Record<string, string>) {
  return `/leads?${new URLSearchParams(params).toString()}`;
}

function ClickRow({
  href,
  label,
  value,
  suffix,
}: {
  href: string;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-background/80"
    >
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="ml-2 shrink-0 font-semibold tabular-nums text-foreground">
        {value}{suffix ? ` ${suffix}` : ""}
      </span>
    </Link>
  );
}

export function HomeAnalyticsSection({ stats }: { stats: DashboardAnalytics }) {
  const { t } = useI18n();
  const topToday = stats.topTodayChannel;
  const topChannelName = topToday?.source ? LEAD_SOURCE[topToday.source] : null;

  return (
    <div className="space-y-6">
      {/* BUGUN — asosiy statistika */}
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{t("home.analytics.todayTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.analytics.todaySubtitle")}</p>
          </div>
          {topToday && topToday.count > 0 && topChannelName && (
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
              <TrendingUp className="h-4 w-4" />
              {t("home.analytics.topChannelLabel", { channel: topChannelName, count: String(topToday.count) })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/leads?today=1"
            className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-4 transition-all hover:shadow-md"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("home.analytics.todayTotal")}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{stats.todayTalks}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("home.analytics.todayTotalDesc")}</p>
          </Link>

          {stats.todayByChannel.map((row) => {
            const meta = CHANNEL_META[row.source];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <Link
                key={row.source}
                href={filterHref({ source: row.source, today: "1" })}
                className={cn("rounded-xl border p-4 transition-all hover:shadow-md", meta.card)}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 opacity-80" />
                  <span className="text-2xl font-bold tabular-nums">{row.count}</span>
                </div>
                <p className="mt-2 font-semibold">{LEAD_SOURCE[row.source]}</p>
                <p className="text-xs opacity-80">{t("home.analytics.todayChannel")}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hodimlar bugun */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold">{t("home.analytics.todayEmployees")}</h3>
            </div>
            <Link href="/leads?today=1" className="text-xs font-medium text-primary hover:underline">
              {t("home.open")} <ChevronRight className="inline h-3 w-3" />
            </Link>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{t("home.analytics.todayEmployeesDesc")}</p>
          {stats.todayByEmployee.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("home.analytics.noDataToday")}</p>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-secondary/30">
              {stats.todayByEmployee.map((e) => (
                <ClickRow
                  key={`${e.name}-${e.count}`}
                  href={e.id ? filterHref({ employee: e.id, today: "1" }) : "/leads?today=1"}
                  label={e.name}
                  value={e.count}
                  suffix={t("home.analytics.talksUnit")}
                />
              ))}
            </div>
          )}
        </section>

        {/* Avtomobil qiziqishlari */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold">{t("home.analytics.carInterests")}</h3>
            </div>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{t("home.analytics.carInterestsDesc")}</p>
          {(stats.todayCarInterests.length > 0 ? stats.todayCarInterests : stats.topCarInterests).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("home.analytics.noCarData")}</p>
          ) : (
            <div className="space-y-2">
              {(stats.todayCarInterests.length > 0 ? stats.todayCarInterests : stats.topCarInterests)
                .slice(0, 6)
                .map((c) => (
                  <Link
                    key={c.label}
                    href={filterHref({
                      ...(c.carColor ? { color: c.carColor } : {}),
                      ...(c.carModel ? { car: c.carModel } : {}),
                    })}
                    className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 transition-all hover:bg-amber-500/10"
                  >
                    <span className="text-sm font-medium">
                      {t("home.analytics.carInterestLine", { count: String(c.count), car: c.label })}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
            </div>
          )}
        </section>
      </div>

      {/* Jami (barcha vaqt) */}
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.analytics.allTimeTitle")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {stats.bySource.map((row) => {
            const meta = CHANNEL_META[row.source];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <Link
                key={row.source}
                href={filterHref({ source: row.source })}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 transition-all hover:shadow-sm",
                  meta.card
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{LEAD_SOURCE[row.source]}</span>
                </div>
                <span className="text-xl font-bold tabular-nums">{row.count}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
