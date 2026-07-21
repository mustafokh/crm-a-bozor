"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { resolveCountry } from "@/lib/country-display";
import { useI18n } from "@/components/language-provider";
import { countryLabel, countryLabelFromIso } from "@/lib/i18n/labels";

/** Lokal bayroq rasm + davlat nomi */
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
  const { t } = useI18n();
  const info = resolveCountry({ country, phone });
  const [imgFailed, setImgFailed] = useState(false);
  if (!info) return <span className="text-muted-foreground">—</span>;

  const iso = info.iso?.toLowerCase();
  const showImg = Boolean(iso) && !imgFailed;
  const displayName = country?.trim()
    ? countryLabel(t, country)
    : info.iso
      ? countryLabelFromIso(t, info.iso)
      : info.name;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-950 shadow-sm",
        className
      )}
      title={info.dial || displayName}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/flags/${iso}.png`}
          alt=""
          width={22}
          height={16}
          className="h-4 w-[22px] shrink-0 rounded-[3px] object-cover shadow ring-1 ring-black/15"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className="text-base leading-none" aria-hidden>
          {info.flag}
        </span>
      )}
      <span>{displayName}</span>
      {showDial && info.dial && (
        <span className="font-normal text-sky-700/80">{info.dial}</span>
      )}
    </span>
  );
}
