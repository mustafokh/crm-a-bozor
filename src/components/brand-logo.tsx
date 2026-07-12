import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { img: 32, text: "text-lg", sub: "text-[9px]" },
  md: { img: 44, text: "text-xl", sub: "text-[10px]" },
  lg: { img: 56, text: "text-2xl", sub: "text-xs" },
  xl: { img: 76, text: "text-3xl", sub: "text-sm" },
};

/** Two-tone MKUS wordmark matching the official logo (M = red, KUS = blue). */
export function MkusWordmark({ className, size = "md" }: { className?: string; size?: keyof typeof sizes }) {
  const s = sizes[size];
  return (
    <span className={cn("font-display font-bold tracking-tight leading-none", s.text, className)}>
      <span className="text-brand-red">M</span>
      <span className="text-brand-blue">KUS</span>
    </span>
  );
}

/**
 * Official MKUS logo — PNG image with optional subtitle.
 * Falls back to the CSS wordmark when `variant="text"`.
 */
export function BrandLogo({
  size = "md",
  subtitle,
  href = "/dashboard",
  variant = "image",
  className,
}: {
  size?: keyof typeof sizes;
  subtitle?: string;
  /** Set to `false` to render without a link (e.g. login page). */
  href?: string | false;
  variant?: "image" | "text";
  className?: string;
}) {
  const s = sizes[size];
  const inner = (
    <div className={cn("flex items-center gap-2.5", className)}>
      {variant === "image" ? (
        <Image
          src="/logo.png"
          alt="MKUS"
          width={s.img * 2.8}
          height={s.img}
          className="h-auto w-auto object-contain"
          style={{ height: s.img, width: "auto" }}
          priority
        />
      ) : (
        <MkusWordmark size={size} />
      )}
      {subtitle && (
        <span className={cn("font-medium text-muted-foreground", s.sub)}>{subtitle}</span>
      )}
    </div>
  );

  if (href !== false) {
    return (
      <Link href={href} className="inline-flex items-center gap-2.5">
        {inner}
      </Link>
    );
  }
  return inner;
}
