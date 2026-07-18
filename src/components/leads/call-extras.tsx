"use client";

import { Headphones } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import {
  resolveCallAudioUrl,
  type LatestCallInfo,
} from "@/lib/calls/latest-call";
import { cn } from "@/lib/utils";

export type { LatestCallInfo };

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
