"use client";

import { useState } from "react";
import { Car as CarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Gallery({ images }: { images: { url: string }[] }) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl bg-muted">
        <CarIcon className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active].url} alt="Mashina" className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-thin">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === active ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
