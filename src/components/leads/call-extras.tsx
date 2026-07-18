"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Headphones } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import {
  resolveCallAudioUrl,
  type CallHistoryItem,
  type LatestCallInfo,
} from "@/lib/calls/latest-call";
import { CALL_OUTCOME_COLOR, CALL_SOURCE_TYPE } from "@/lib/constants";
import { formatDateTime, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type { LatestCallInfo, CallHistoryItem };

export function transmissionLabel(
  value: string | null | undefined,
  t: (k: string) => string
): string {
  if (value === "mexanika") return t("calls.transmissionManual");
  if (value === "avtomat") return t("calls.transmissionAuto");
  return value || "—";
}

export function DirectionBadge({
  direction,
  className,
}: {
  direction?: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  if (direction === "incoming") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400",
          className
        )}
        title={t("calls.directionIncoming")}
      >
        <span aria-hidden>🟢</span>
        <span aria-hidden>↙</span>
        {t("calls.directionIncoming")}
      </span>
    );
  }
  if (direction === "outgoing") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400",
          className
        )}
        title={t("calls.directionOutgoing")}
      >
        <span aria-hidden>🔵</span>
        <span aria-hidden>↗</span>
        {t("calls.directionOutgoing")}
      </span>
    );
  }
  return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
}

export function ListenAudioLink({
  call,
  className,
}: {
  call?: LatestCallInfo | null;
  className?: string;
}) {
  const { t } = useI18n();
  const audio = resolveCallAudioUrl(call);
  if (!audio) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("calls.noAudio")}
      </span>
    );
  }
  return (
    <a
      href={audio}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Headphones className="h-3.5 w-3.5" />
      {t("calls.listenAudio")}
    </a>
  );
}

export function CallTranscriptBlock({ call }: { call?: LatestCallInfo | null }) {
  const { t } = useI18n();
  if (!call?.rawTranscript?.trim()) return null;
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{t("calls.rawTranscript")}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-xs">
        {call.rawTranscript}
      </pre>
    </div>
  );
}

export function CallHistoryCard({ call }: { call: CallHistoryItem }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const sourceLabel =
    (call.source && CALL_SOURCE_TYPE[call.source]) || call.source || "—";
  const outcomeLabel = call.outcome
    ? t(`enum.callOutcome.${call.outcome}`) || call.outcome
    : null;
  const summary =
    call.summary?.trim() ||
    (call.rawTranscript?.trim().slice(0, 120) || "—");

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {call.callDate ? formatDateTime(call.callDate) : "—"}
            </span>
            <Badge className="bg-secondary text-secondary-foreground font-normal">
              {sourceLabel}
            </Badge>
            <DirectionBadge direction={call.direction} />
            {outcomeLabel && (
              <Badge
                className={cn(
                  "font-normal text-xs",
                  CALL_OUTCOME_COLOR[call.outcome!] || "bg-secondary text-secondary-foreground"
                )}
              >
                {outcomeLabel}
              </Badge>
            )}
          </div>
          <p className="text-sm leading-snug text-foreground/90 line-clamp-2">{summary}</p>
          {(call.carModel || call.employeeName) && (
            <p className="text-xs text-muted-foreground">
              {[call.carModel, call.carColor, call.employeeName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t("leads.hideFull") : t("leads.viewFull")}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <ListenAudioLink call={call} />
          {call.rawTranscript?.trim() ? (
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-xs">
              {call.rawTranscript}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>
      )}
    </div>
  );
}
