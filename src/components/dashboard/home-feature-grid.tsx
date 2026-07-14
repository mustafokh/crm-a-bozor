"use client";

import Link from "next/link";
import {
  Filter, Phone, Plus, Users, Globe, Settings, Link2,
  ChevronRight, UserPlus, BarChart3,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface HomeStats {
  total: number;
  todayTalks: number;
  todayCallsTotal: number;
  unassigned: number;
  active: number;
  byEmployee: { id: string | null; name: string; count: number }[];
  byCountry: { country: string; count: number }[];
  byOutcome: { outcome: string; count: number }[];
  bySource: { source: string; count: number }[];
  todayByChannel: { source: string; count: number }[];
  todayByEmployee: { name: string; count: number }[];
  topCarInterests: { label: string; carColor: string | null; carModel: string | null; count: number }[];
  recentLeads: {
    id: string;
    fullName: string;
    phone: string;
    country: string | null;
    talkedAt: Date | null;
    carMake: string | null;
    carModel: string | null;
    carYear: number | null;
    carColor: string | null;
    outcome: string | null;
    assignedTo: { name: string } | null;
  }[];
}

interface Feature {
  id: string;
  href: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  stat?: number | string;
  statLabelKey?: string;
  accent: string;
  external?: boolean;
  adminOnly?: boolean;
  preview?: { label: string; value: number; href?: string }[];
}

export function HomeFeatureGrid({
  stats,
  isAdmin,
}: {
  stats: HomeStats;
  isAdmin: boolean;
}) {
  const { t } = useI18n();

  const features: Feature[] = [
    {
      id: "leads",
      href: "/leads",
      icon: Filter,
      titleKey: "home.features.leads.title",
      descKey: "home.features.leads.desc",
      stat: stats.total,
      statLabelKey: "home.features.leads.stat",
      accent: "from-brand-blue/15 to-brand-blue/5 border-brand-blue/20 hover:border-brand-blue/40",
    },
    {
      id: "today",
      href: "/leads?today=1",
      icon: Phone,
      titleKey: "home.features.today.title",
      descKey: "home.features.today.desc",
      stat: stats.todayTalks,
      statLabelKey: "home.features.today.stat",
      accent: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40",
    },
    {
      id: "add",
      href: "/leads?new=1",
      icon: Plus,
      titleKey: "home.features.add.title",
      descKey: "home.features.add.desc",
      accent: "from-brand-red/15 to-brand-red/5 border-brand-red/20 hover:border-brand-red/40",
    },
    {
      id: "unassigned",
      href: "/leads?unassigned=1",
      icon: UserPlus,
      titleKey: "home.features.unassigned.title",
      descKey: "home.features.unassigned.desc",
      stat: stats.unassigned,
      statLabelKey: "home.features.unassigned.stat",
      accent: "from-amber-500/15 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
    },
    {
      id: "employees",
      href: "/leads?today=1",
      icon: Users,
      titleKey: "home.features.employees.title",
      descKey: "home.features.employees.desc",
      stat: stats.byEmployee.length,
      preview: stats.byEmployee.slice(0, 3).map((e) => ({
        label: e.name,
        value: e.count,
        href: e.id ? `/leads?employee=${e.id}` : "/leads?unassigned=1",
      })),
      accent: "from-indigo-500/15 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40",
    },
    {
      id: "countries",
      href: "/leads",
      icon: Globe,
      titleKey: "home.features.countries.title",
      descKey: "home.features.countries.desc",
      stat: stats.byCountry.length,
      preview: stats.byCountry.slice(0, 3).map((c) => ({
        label: c.country,
        value: c.count,
        href: `/leads?country=${encodeURIComponent(c.country)}`,
      })),
      accent: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40",
    },
    {
      id: "stats",
      href: "/leads",
      icon: BarChart3,
      titleKey: "home.features.stats.title",
      descKey: "home.features.stats.desc",
      stat: stats.active,
      statLabelKey: "home.features.stats.stat",
      preview: stats.byOutcome.slice(0, 3).map((o) => ({
        label: t(`enum.leadOutcome.${o.outcome}`) || o.outcome,
        value: o.count,
        href: `/leads?outcome=${encodeURIComponent(o.outcome)}`,
      })),
      accent: "from-violet-500/15 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40",
    },
    {
      id: "apply",
      href: "/apply",
      icon: Link2,
      titleKey: "home.features.apply.title",
      descKey: "home.features.apply.desc",
      external: true,
      accent: "from-muted/80 to-muted/40 border-border hover:border-primary/30",
    },
    ...(isAdmin
      ? [{
          id: "settings",
          href: "/settings",
          icon: Settings,
          titleKey: "home.features.settings.title",
          descKey: "home.features.settings.desc",
          adminOnly: true,
          accent: "from-muted/80 to-muted/40 border-border hover:border-primary/30",
        } as Feature]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {features.map((f) => {
        const Icon = f.icon;
        const inner = (
          <div
            className={cn(
              "group relative flex h-full min-h-[148px] flex-col rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
              f.accent
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-background/80 shadow-sm">
                <Icon className="h-5 w-5 text-foreground/80" />
              </div>
              {f.stat !== undefined && (
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums">{f.stat}</p>
                  {f.statLabelKey && (
                    <p className="text-[11px] text-muted-foreground">{t(f.statLabelKey)}</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 flex-1">
              <h3 className="font-semibold text-foreground">{t(f.titleKey)}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t(f.descKey)}</p>
            </div>

            {f.preview && f.preview.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
                {f.preview.map((p) => (
                  p.href ? (
                    <Link
                      key={p.label}
                      href={p.href}
                      onClick={(e) => e.stopPropagation()}
                      className="flex justify-between text-xs text-muted-foreground hover:text-primary"
                    >
                      <span className="truncate">{p.label}</span>
                      <span className="font-medium text-foreground">{p.value}</span>
                    </Link>
                  ) : (
                    <div key={p.label} className="flex justify-between text-xs text-muted-foreground">
                      <span className="truncate">{p.label}</span>
                      <span className="font-medium text-foreground">{p.value}</span>
                    </div>
                  )
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              {t("home.open")} <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </div>
        );

        if (f.external) {
          return (
            <a key={f.id} href={f.href} target="_blank" rel="noopener noreferrer">
              {inner}
            </a>
          );
        }
        return (
          <Link key={f.id} href={f.href}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
