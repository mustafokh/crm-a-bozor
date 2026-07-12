"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Car as CarIcon,
  Gauge,
  Fuel,
  Loader2,
  Send,
} from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { useI18n } from "@/components/language-provider";
import { useTranslatedEnums } from "@/lib/i18n/use-enums";
import { CAR_STATUS_COLOR } from "@/lib/constants";
import { formatMoney, cn } from "@/lib/utils";

interface PublicCar {
  id: string;
  make: string;
  model: string;
  year: number;
  color?: string | null;
  mileage: number;
  condition: string;
  salePrice: number;
  currency: string;
  status: string;
  transmission?: string | null;
  fuelType?: string | null;
  drivetrain?: string | null;
  engineVolume?: number | null;
  description?: string | null;
  images: { url: string; isPrimary?: boolean }[];
}

export default function ShowroomCarPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const enums = useTranslatedEnums();
  const [car, setCar] = useState<PublicCar | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    fetch(`/api/public/showroom/${id}`)
      .then((r) => r.json())
      .then((d) => setCar(d.car ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PublicShell active="showroom">
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PublicShell>
    );
  }

  if (!car) {
    return (
      <PublicShell active="showroom">
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p>{t("public.showroom.notFound")}</p>
          <LinkButton href="/showroom" className="mt-4">
            {t("common.back")}
          </LinkButton>
        </div>
      </PublicShell>
    );
  }

  const images = car.images?.length ? car.images : [];
  const mainImg = images[activeImg]?.url;

  const specs = [
    { label: t("col.year"), value: String(car.year) },
    { label: t("col.mileage"), value: `${new Intl.NumberFormat("ru-RU").format(car.mileage)} km` },
    { label: t("col.condition"), value: enums.carCondition(car.condition) },
    car.color ? { label: t("public.showroom.color"), value: car.color } : null,
    car.transmission ? { label: t("public.showroom.transmission"), value: enums.transmission(car.transmission) } : null,
    car.fuelType ? { label: t("public.showroom.fuel"), value: enums.fuel(car.fuelType) } : null,
    car.drivetrain ? { label: t("public.showroom.drivetrain"), value: enums.drivetrain(car.drivetrain) } : null,
    car.engineVolume ? { label: t("public.showroom.engine"), value: `${car.engineVolume} L` } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <PublicShell active="showroom">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/showroom"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("public.showroom.backToCatalog")}
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImg} alt={`${car.make} ${car.model}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <CarIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <span
                className={cn(
                  "absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-md",
                  CAR_STATUS_COLOR[car.status]
                )}
              >
                {enums.carStatus(car.status)}
              </span>
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={cn(
                      "h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                      activeImg === i ? "border-brand-blue" : "border-transparent opacity-70"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {car.make} {car.model}
            </h1>
            <p className="mt-4 font-display text-3xl font-bold text-brand-blue">
              {formatMoney(car.salePrice, car.currency)}
            </p>

            <Card className="mt-6 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("public.showroom.specs")}
              </h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {specs.map((s) => (
                  <div key={s.label}>
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd className="font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {car.description && (
              <Card className="mt-4 p-4">
                <h2 className="mb-2 text-sm font-semibold">{t("common.description")}</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{car.description}</p>
              </Card>
            )}

            <LinkButton href={`/apply?car=${car.id}&source=instagram`} size="lg" className="mt-6 w-full">
              <Send className="h-4 w-4" /> {t("public.showroom.interested")}
            </LinkButton>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
