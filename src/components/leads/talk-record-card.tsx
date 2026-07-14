"use client";

import { Badge } from "@/components/ui/badge";
import { CarColorBadge } from "@/components/ui/car-color-badge";
import { useI18n } from "@/components/language-provider";
import { LEAD_OUTCOME_COLOR, PAYMENT_TYPE } from "@/lib/constants";
import { formatCarShort } from "@/lib/lead-helpers";
import { formatDateTime, cn } from "@/lib/utils";

export interface TalkRecord {
  id?: string;
  talkedAt?: string | null;
  carMake?: string | null;
  carModel?: string | null;
  carYear?: number | null;
  carColor?: string | null;
  carInterest?: string | null;
  budget?: string | null;
  paymentType?: string | null;
  clientWants?: string | null;
  discussionNotes?: string | null;
  outcome?: string | null;
  user?: { id: string; name: string } | null;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
    </div>
  );
}

export function TalkRecordCard({ record, compact }: { record: TalkRecord; compact?: boolean }) {
  const { t } = useI18n();
  const outcomeLabel = record.outcome
    ? t(`enum.leadOutcome.${record.outcome}`) || record.outcome
    : null;

  return (
    <div className={cn("rounded-xl border border-border bg-muted/20 p-4", compact && "p-3")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {record.user?.name && (
          <span className="font-semibold text-sm">{record.user.name}</span>
        )}
        {record.talkedAt && (
          <span className="text-xs text-muted-foreground">{formatDateTime(record.talkedAt)}</span>
        )}
        {record.outcome && (
          <Badge className={cn("font-normal text-xs", LEAD_OUTCOME_COLOR[record.outcome])}>
            {outcomeLabel}
          </Badge>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t("leads.col.carInterest")} value={formatCarShort(record)} />
        {record.carColor ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("leads.col.carColor")}:</span>
            <CarColorBadge color={record.carColor} />
          </div>
        ) : null}
        <Field label={t("leads.col.budget")} value={record.budget} />
        <Field
          label={t("leads.col.payment")}
          value={record.paymentType ? PAYMENT_TYPE[record.paymentType] ?? record.paymentType : null}
        />
        <Field label={t("leads.col.clientWants")} value={record.clientWants} />
      </div>

      {record.discussionNotes && (
        <p className="mt-3 rounded-lg bg-background/80 p-3 text-sm text-muted-foreground">
          {record.discussionNotes}
        </p>
      )}
    </div>
  );
}
