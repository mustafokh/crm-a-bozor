"use client";

import { cn } from "@/lib/utils";
import { resolveCarColor } from "@/lib/car-color";

/** Black / White + rang stickeri */
export function CarColorBadge({
  color,
  className,
  showLocal = false,
  size = "md",
}: {
  color?: string | null;
  className?: string;
  showLocal?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const info = resolveCarColor(color);
  if (!info) return <span className="text-muted-foreground">—</span>;

  const swatch = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const pad = size === "lg" ? "px-3 py-1.5 text-sm" : size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/80 bg-card font-semibold shadow-sm",
        pad,
        className
      )}
      title={info.labelLocal}
    >
      <span
        className={cn(
          "shrink-0 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] ring-1 ring-black/15",
          swatch,
          info.border && "border border-slate-300"
        )}
        style={{ backgroundColor: info.hex }}
        aria-hidden
      />
      <span className="tracking-wide text-foreground">{info.labelEn}</span>
      {showLocal && info.labelLocal !== info.labelEn && (
        <span className="font-normal text-muted-foreground">({info.labelLocal})</span>
      )}
    </span>
  );
}
