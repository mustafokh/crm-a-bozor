"use client";

import { cn } from "@/lib/utils";
import { resolveCarColor } from "@/lib/car-color";
import { useI18n } from "@/components/language-provider";
import { carColorLabel } from "@/lib/i18n/labels";

/** Black / White + rang stickeri (har doim ko‘rinadigan) */
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
  const { t } = useI18n();
  const info = resolveCarColor(color);
  if (!info) return <span className="text-muted-foreground">—</span>;

  const swatch = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  const pad = size === "lg" ? "px-3 py-1.5 text-sm" : size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const label = carColorLabel(t, color);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 border-amber-200 bg-amber-50 font-bold text-amber-950 shadow-sm",
        pad,
        className
      )}
      title={label}
    >
      <span
        className={cn(
          "shrink-0 rounded-full ring-2 ring-black/20",
          swatch,
          info.border && "border-2 border-slate-400"
        )}
        style={{ backgroundColor: info.hex }}
        aria-hidden
      />
      <span className="tracking-wide">{label}</span>
      {showLocal && info.labelLocal !== label && (
        <span className="font-medium text-amber-800/70">({info.labelLocal})</span>
      )}
    </span>
  );
}
