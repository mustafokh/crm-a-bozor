"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { resolveCountry } from "@/lib/country-display";

/** Telefon input — kodga qarab bayroq ko‘rsatadi */
export function PhoneInput({
  value,
  onChange,
  className,
  placeholder = "+998 90 123 45 67",
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const info = resolveCountry({ phone: value });
  const [imgFailed, setImgFailed] = useState(false);
  const iso = info?.iso?.toLowerCase();
  const showImg = Boolean(iso) && !imgFailed;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
        {info ? (
          showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/flags/${iso}.png`}
              alt=""
              width={22}
              height={16}
              className="h-4 w-[22px] rounded-[2px] object-cover shadow ring-1 ring-black/15"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="text-base leading-none">{info.flag}</span>
          )
        ) : (
          <span className="text-sm text-muted-foreground">🌐</span>
        )}
      </div>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setImgFailed(false);
          onChange(e.target.value);
        }}
        className={cn("pl-11", className)}
      />
    </div>
  );
}
