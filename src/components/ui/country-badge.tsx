"use client";

import { cn } from "@/lib/utils";
import { resolveCountry } from "@/lib/country-display";

/** Bayroq (rasm) + davlat nomi — emoji o‘rniga flagcdn (hamma joyda ko‘rinadi) */
export function CountryBadge({
  country,
  phone,
  className,
  showDial = false,
}: {
  country?: string | null;
  phone?: string | null;
  className?: string;
  showDial?: boolean;
}) {
  const info = resolveCountry({ country, phone });
  if (!info) return <span className="text-muted-foreground">—</span>;

  const iso = info.iso?.toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2.5 py-1 text-xs font-semibold shadow-sm",
        className
      )}
      title={info.dial || info.name}
    >
      {iso ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://flagcdn.com/w40/${iso}.png`}
          alt=""
          width={20}
          height={14}
          className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-sm ring-1 ring-black/10"
          loading="lazy"
        />
      ) : (
        <span className="text-base leading-none" aria-hidden>
          {info.flag}
        </span>
      )}
      <span>{info.name}</span>
      {showDial && info.dial && (
        <span className="font-normal text-muted-foreground">{info.dial}</span>
      )}
    </span>
  );
}
