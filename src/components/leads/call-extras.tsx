"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Headphones } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import {
  displayInteractionSummary,
  isMessagingSource,
  messagingDisplayText,
  shouldShowCallOutcome,
  shouldShowCarDetails,
  withEffectiveSource,
} from "@/lib/calls/call-history-helpers";
import {
  resolveCallAudioUrl,
  type CallHistoryItem,
  type LatestCallInfo,
} from "@/lib/calls/latest-call";
import { CALL_OUTCOME_COLOR } from "@/lib/constants";
import { callSourceTypeLabel } from "@/lib/i18n/labels";
import { formatDateTime, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TranscriptBubbles, TranscriptDialogView } from "@/components/leads/transcript-dialog";

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
  if (!call || isMessagingSource(call.source)) return null;
  if (!call.rawTranscript?.trim() && !call.formattedTranscript?.trim()) return null;
  return (
    <TranscriptDialogView
      formattedTranscript={call.formattedTranscript}
      rawTranscript={call.rawTranscript}
    />
  );
}

export function MessageTranscriptBlock({ call }: { call?: LatestCallInfo | null }) {
  if (!call || !isMessagingSource(call.source)) return null;
  const text = call.formattedTranscript?.trim() || call.rawTranscript?.trim();
  if (!text) return null;
  return <TranscriptBubbles text={text} />;
}

export function CallHistoryCard({ call }: { call: CallHistoryItem }) {
  const { t } = useI18n();
  const normalized = withEffectiveSource(call);
  if (isMessagingSource(normalized.source)) {
    return <MessageHistoryCard call={normalized} />;
  }
  const [open, setOpen] = useState(false);
  const sourceLabel = callSourceTypeLabel(t, call.source);
  const outcomeLabel = call.outcome
    ? t(`enum.callOutcome.${call.outcome}`) || call.outcome
    : null;
  const summary = displayInteractionSummary(call);
  const showOutcome = shouldShowCallOutcome(call);
  const showCarDetails = shouldShowCarDetails(call);

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
            {showOutcome && outcomeLabel && (
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
          {showCarDetails && (
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
          {call.formattedTranscript?.trim() || call.rawTranscript?.trim() ? (
            <TranscriptDialogView
              formattedTranscript={call.formattedTranscript}
              rawTranscript={call.rawTranscript}
            />
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageHistoryCard({ call }: { call: CallHistoryItem }) {
  const { t } = useI18n();
  const normalized = withEffectiveSource(call);
  const sourceLabel = callSourceTypeLabel(t, normalized.source);
  const text = messagingDisplayText(normalized);
  const showCarDetails = shouldShowCarDetails(normalized);

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {normalized.callDate ? formatDateTime(normalized.callDate) : "—"}
        </span>
        <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-normal">
          {sourceLabel}
        </Badge>
        <DirectionBadge direction={normalized.direction} />
        {normalized.employeeName && (
          <span className="text-foreground/80">{normalized.employeeName}</span>
        )}
      </div>
      {text ? (
        <TranscriptBubbles text={text} className="max-h-48" />
      ) : (
        <p className="text-sm leading-snug text-foreground/90">—</p>
      )}
      {showCarDetails && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("leads.col.carInterest")}:{" "}
          {[normalized.carModel, normalized.carColor].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
