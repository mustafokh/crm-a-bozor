"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import {
  formatHistoryDayLabel,
  groupByDay,
} from "@/lib/history-by-day";
import { cn } from "@/lib/utils";

export interface HistoryByDayAccordionProps<T> {
  items: T[];
  getDate: (item: T) => string | null | undefined;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** i18n key with `{count}` — e.g. leads.historyDayCount */
  countLabelKey: string;
  className?: string;
  maxHeight?: string;
}

export function HistoryByDayAccordion<T>({
  items,
  getDate,
  getKey,
  renderItem,
  countLabelKey,
  className,
  maxHeight = "max-h-[420px]",
}: HistoryByDayAccordionProps<T>) {
  const { t, locale } = useI18n();
  const groups = useMemo(() => groupByDay(items, getDate), [items, getDate]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  if (groups.length === 0) return null;

  function toggle(dayKey: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  }

  return (
    <div className={cn(maxHeight, "space-y-2 overflow-y-auto pr-1", className)}>
      {groups.map(({ dayKey, items: dayItems }) => {
        const isOpen = expanded.has(dayKey);
        const label = formatHistoryDayLabel(dayKey, locale, t);
        const countLabel = t(countLabelKey, { count: dayItems.length });

        return (
          <div
            key={dayKey}
            className="overflow-hidden rounded-xl border border-border bg-card/50"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              aria-expanded={isOpen}
              onClick={() => toggle(dayKey)}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )}
              />
              <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                {label}
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {countLabel}
              </span>
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-border px-3 py-3">
                {dayItems.map((item) => (
                  <div key={getKey(item)}>{renderItem(item)}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
