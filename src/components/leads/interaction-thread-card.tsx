"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/language-provider";
import { formatDateTime, cn } from "@/lib/utils";
import {
  interactionOutcomeLabel,
  interactionTopicLabel,
  type InteractionInfo,
} from "@/lib/calls/interaction-helpers";
import { LEAD_OUTCOME_COLOR } from "@/lib/constants";
import { MessageHistoryCard } from "@/components/leads/call-extras";
import { CallHistoryCard } from "@/components/leads/call-extras";
import { HistoryByDayAccordion } from "@/components/leads/history-by-day-accordion";

type Props = {
  interaction: InteractionInfo;
  defaultOpen?: boolean;
};

export function InteractionThreadCard({ interaction, defaultOpen = false }: Props) {
  const { t } = useI18n();
  const topic = interactionTopicLabel(interaction);
  const outcome = interaction.outcome;
  const messages = interaction.calls.filter(
    (c) => c.source === "whatsapp" || c.source === "telegram"
  );
  const phoneCalls = interaction.calls.filter((c) => c.source === "call");

  return (
    <details
      className={cn(
        "group rounded-xl border border-border bg-card/50",
        defaultOpen && "open"
      )}
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{topic}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(interaction.startedAt)}
              {interaction.closedAt && ` — ${formatDateTime(interaction.closedAt)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {interaction.status === "closed" && (
              <Badge className="bg-secondary text-secondary-foreground font-normal text-xs">
                {t("leads.interactionClosed")}
              </Badge>
            )}
            {outcome && (
              <Badge className={cn("font-normal text-xs", LEAD_OUTCOME_COLOR[outcome])}>
                {interactionOutcomeLabel(t, outcome)}
              </Badge>
            )}
            <Badge className="bg-muted text-muted-foreground font-normal text-xs capitalize">
              {interaction.source}
            </Badge>
          </div>
        </div>
        {interaction.summary && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{interaction.summary}</p>
        )}
      </summary>

      <div className="border-t border-border px-4 py-3 space-y-4">
        {messages.length > 0 && (
          <HistoryByDayAccordion
            items={messages}
            getDate={(c) => c.callDate}
            getKey={(c) => c.id}
            countLabelKey="leads.historyDayCount"
            renderItem={(c) => <MessageHistoryCard call={c} />}
          />
        )}
        {phoneCalls.length > 0 && (
          <HistoryByDayAccordion
            items={phoneCalls}
            getDate={(c) => c.callDate}
            getKey={(c) => c.id}
            countLabelKey="leads.historyDayCount"
            renderItem={(c) => <CallHistoryCard call={c} />}
          />
        )}
      </div>
    </details>
  );
}
