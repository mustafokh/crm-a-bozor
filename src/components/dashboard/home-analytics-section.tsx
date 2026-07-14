"use client";

import Link from "next/link";
import {
  Phone, MessageCircle, Send, Users, Car, ChevronRight,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { LEAD_SOURCE, CALL_SOURCE_TYPE } from "@/lib/constants";
import type { LucideIcon } from "lucide-react";

export interface DashboardAnalytics {
  bySource: { source: string; count: number }[];
  todayByChannel: { source: string; count: number }[];
  todayCallsTotal: number;
  todayByEmployee: { name: string; count: number }[];
  topCarInterests: { label: string; carColor: string | null; carModel: string | null; count: number }[];
}

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  CALL: Phone,
  WHATSAPP: MessageCircle,
  TELEGRAM: Send,
};

function StatCard({
  href,
  title,
  subtitle,
  stat,
  icon: Icon,
  accent,
  preview,
}: {
  href: string;
  title: string;
  subtitle: string;
  stat?: number | string;
  icon: LucideIcon;
  accent: string;
  preview?: { label: string; value: number }[];
}) {
  return (
    <Link href={href} className="block h-full">
      <div
        className={cn(
          "group flex h-full min-h-[140px] flex-col rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
          accent
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/80 shadow-sm">
            <Icon className="h-5 w-5 text-foreground/80" />
          </div>
          {stat !== undefined && (
            <p className="text-2xl font-bold tabular-nums">{stat}</p>
          )}
        </div>
        <h3 className="mt-3 font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
        {preview && preview.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
            {preview.map((p) => (
              <div key={p.label} className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate">{p.label}</span>
                <span className="font-medium text-foreground">{p.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-center gap-1 pt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Ko&apos;rish <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}

export function HomeAnalyticsSection({ stats }: { stats: DashboardAnalytics }) {
  const { t } = useI18n();

  const topChannel = [...stats.todayByChannel].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="mt-8 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("home.analytics.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("home.analytics.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.bySource.map((row) => {
          const Icon = CHANNEL_ICONS[row.source] ?? Phone;
          return (
            <StatCard
              key={row.source}
              href={`/leads?source=${row.source}`}
              title={LEAD_SOURCE[row.source] ?? row.source}
              subtitle={t("home.analytics.channelTotal")}
              stat={row.count}
              icon={Icon}
              accent={
                row.source === "CALL"
                  ? "from-brand-blue/15 to-brand-blue/5 border-brand-blue/20 hover:border-brand-blue/40"
                  : row.source === "WHATSAPP"
                    ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                    : "from-sky-500/15 to-sky-500/5 border-sky-500/20 hover:border-sky-500/40"
              }
            />
          );
        })}
        <StatCard
          href="/leads?today=1"
          title={t("home.analytics.todayCalls")}
          subtitle={
            topChannel && topChannel.count > 0
              ? `${CALL_SOURCE_TYPE[topChannel.source] ?? topChannel.source} — ${t("home.analytics.topToday")}`
              : t("home.analytics.todayCallsDesc")
          }
          stat={stats.todayCallsTotal}
          icon={Phone}
          accent="from-violet-500/15 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40"
          preview={stats.todayByChannel
            .filter((c) => c.count > 0)
            .map((c) => ({
              label: CALL_SOURCE_TYPE[c.source] ?? c.source,
              value: c.count,
            }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatCard
          href="/leads?today=1"
          title={t("home.analytics.todayEmployees")}
          subtitle={t("home.analytics.todayEmployeesDesc")}
          stat={stats.todayByEmployee.reduce((s, e) => s + e.count, 0)}
          icon={Users}
          accent="from-indigo-500/15 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40"
          preview={stats.todayByEmployee.slice(0, 5).map((e) => ({
            label: e.name,
            value: e.count,
          }))}
        />
        <StatCard
          href="/leads"
          title={t("home.analytics.carInterests")}
          subtitle={t("home.analytics.carInterestsDesc")}
          stat={stats.topCarInterests.length}
          icon={Car}
          accent="from-amber-500/15 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
          preview={stats.topCarInterests.slice(0, 5).map((c) => ({
            label: c.label,
            value: c.count,
          }))}
        />
      </div>

      {stats.topCarInterests.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("home.analytics.carBreakdown")}</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topCarInterests.map((c) => (
              <Link
                key={c.label}
                href={`/leads?${new URLSearchParams({
                  ...(c.carColor ? { color: c.carColor } : {}),
                  ...(c.carModel ? { car: c.carModel } : {}),
                }).toString()}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
              >
                <span className="font-medium">{c.label}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {c.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
