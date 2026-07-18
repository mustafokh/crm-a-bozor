"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/components/language-provider";
import { cn } from "@/lib/utils";

export type TranscriptTurn = {
  speaker: "mijoz" | "xodim";
  text: string;
};

/** Mijoz:/Xodim: matnini chat turnlariga ajratadi. */
export function parseDialogTurns(text: string): TranscriptTurn[] {
  const lines = text.split(/\r?\n/);
  const turns: TranscriptTurn[] = [];
  let current: TranscriptTurn | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(Mijoz|Xodim)\s*:\s*(.*)$/i);
    if (m) {
      if (current) turns.push(current);
      const speaker = /^mijoz$/i.test(m[1]!) ? "mijoz" : "xodim";
      current = { speaker, text: (m[2] ?? "").trim() };
    } else if (current) {
      current.text = `${current.text}\n${line}`.trim();
    } else {
      // Yorliqsiz qator — mijoz deb ko'rsatamiz
      current = { speaker: "mijoz", text: line };
    }
  }
  if (current?.text) turns.push(current);
  return turns.filter((t) => t.text.trim());
}

export function TranscriptBubbles({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { t } = useI18n();
  const turns = useMemo(() => parseDialogTurns(text), [text]);

  if (turns.length === 0) {
    return (
      <pre
        className={cn(
          "max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-xs",
          className
        )}
      >
        {text}
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "flex max-h-72 flex-col gap-2 overflow-auto rounded-lg bg-secondary/40 p-3",
        className
      )}
    >
      {turns.map((turn, i) => {
        const isCustomer = turn.speaker === "mijoz";
        return (
          <div
            key={`${turn.speaker}-${i}`}
            className={cn("flex", isCustomer ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm",
                isCustomer
                  ? "rounded-bl-md bg-sky-500/15 text-sky-950 dark:text-sky-100"
                  : "rounded-br-md bg-emerald-500/15 text-emerald-950 dark:text-emerald-100"
              )}
            >
              <p
                className={cn(
                  "mb-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  isCustomer
                    ? "text-sky-700 dark:text-sky-300"
                    : "text-emerald-700 dark:text-emerald-300"
                )}
              >
                {isCustomer ? t("calls.speakerCustomer") : t("calls.speakerEmployee")}
              </p>
              <p className="whitespace-pre-wrap">{turn.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Formatlangan dialogni bubble ko'rinishida, ixtiyoriy "Asl transkript" toggle bilan.
 */
export function TranscriptDialogView({
  formattedTranscript,
  rawTranscript,
  className,
}: {
  formattedTranscript?: string | null;
  rawTranscript?: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  const formatted = formattedTranscript?.trim() || null;
  const raw = rawTranscript?.trim() || null;
  const [showRaw, setShowRaw] = useState(false);

  if (!formatted && !raw) return null;

  const preferFormatted = Boolean(formatted);
  const displayFormatted = preferFormatted && !showRaw;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {displayFormatted
            ? t("calls.formattedTranscript")
            : t("calls.rawTranscript")}
        </p>
        {preferFormatted && raw && (
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setShowRaw((v) => !v)}
          >
            {showRaw ? t("calls.showFormatted") : t("calls.showRaw")}
          </button>
        )}
      </div>
      {displayFormatted ? (
        <TranscriptBubbles text={formatted!} />
      ) : (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-xs">
          {raw || formatted}
        </pre>
      )}
    </div>
  );
}
