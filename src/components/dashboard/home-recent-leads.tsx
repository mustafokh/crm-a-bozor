"use client";

import Link from "next/link";
import { ChevronRight, Phone } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { CarColorBadge } from "@/components/ui/car-color-badge";
import { CountryBadge } from "@/components/ui/country-badge";
import { LEAD_OUTCOME_COLOR } from "@/lib/constants";
import { formatCarShort } from "@/lib/lead-helpers";
import { formatDateTime, cn } from "@/lib/utils";
import type { HomeStats } from "./home-feature-grid";

export function HomeRecentLeads({ leads }: { leads: HomeStats["recentLeads"] }) {
  const { t } = useI18n();

  if (leads.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t("leads.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <Link
          key={lead.id}
          href={`/leads?id=${lead.id}`}
          className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{lead.fullName}</span>
              <CountryBadge country={lead.country} phone={lead.phone} />
              {lead.outcome && (
                <Badge className={cn("text-xs font-normal", LEAD_OUTCOME_COLOR[lead.outcome])}>
                  {t(`enum.leadOutcome.${lead.outcome}`) || lead.outcome}
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="truncate">{formatCarShort(lead)}</span>
              {lead.carColor && lead.carColor !== "—" && <CarColorBadge color={lead.carColor} />}
              {lead.assignedTo?.name && <span>· {lead.assignedTo.name}</span>}
            </div>
            {lead.talkedAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(lead.talkedAt)}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      ))}
      <Link
        href="/leads"
        className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary hover:underline"
      >
        {t("home.viewAllLeads")} <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
