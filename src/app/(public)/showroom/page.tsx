"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Car as CarIcon,
  Gauge,
  Fuel,
  Loader2,
  ArrowRight,
  Instagram,
} from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Input, Select } from "@/components/ui/input";
import { useI18n } from "@/components/language-provider";
import { useTranslatedEnums } from "@/lib/i18n/use-enums";
import {
  CAR_STATUS_COLOR,
} from "@/lib/constants";
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

export default function ShowroomPage() {
  const { t } = useI18n();
  const enums = useTranslatedEnums();
  const [cars, setCars] = useState<PublicCar[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [make, setMake] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (make !== "ALL") params.set("make", make);
      const res = await fetch(`/api/public/showroom?${params.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setCars(data.cars ?? []);
      setMakes(data.makes ?? []);
    } catch {
      setCars([]);
      setMakes([]);
    } finally {
      setLoading(false);
    }
  }, [q, make]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <PublicShell active="showroom">
      {/* Hero — Instagram bio style */}
      <section className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-card via-card to-brand-blue/[0.04] py-14 sm:py-20">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-red/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-brand-blue/[0.1] blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-4 py-1.5 text-sm font-medium text-brand-blue">
            <Instagram className="h-4 w-4" />
            <span>MKUS Avtosalon</span>
          </div>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {t("public.showroom.title")}
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            {t("public.showroom.subtitle")}
          </p>
          <LinkButton href="/apply?source=instagram" size="lg" className="mt-8">
            {t("public.showroom.applyCta")} <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Card className="mb-6 p-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("public.showroom.search")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={make} onChange={(e) => setMake(e.target.value)} className="sm:w-48">
              <option value="ALL">{t("inventory.allMakes")}</option>
              {makes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cars.length === 0 ? (
          <Card className="py-16 text-center">
            <CarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">{t("public.showroom.empty")}</p>
            <LinkButton href="/apply" variant="outline" className="mt-4">
              {t("public.apply.submit")}
            </LinkButton>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car, i) => {
              const img = car.images?.find((im) => im.isPrimary)?.url || car.images?.[0]?.url;
              return (
                <Card
                  key={car.id}
                  className="fade-up overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lift"
                  style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
                >
                  <Link href={`/showroom/${car.id}`} className="block">
                    <div className="relative aspect-[4/3] bg-muted">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={`${car.make} ${car.model}`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <CarIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md",
                          CAR_STATUS_COLOR[car.status]
                        )}
                      >
                        {enums.carStatus(car.status)}
                      </span>
                    </div>
                  </Link>
                  <div className="p-4">
                    <Link href={`/showroom/${car.id}`}>
                      <h3 className="font-display text-lg font-semibold hover:text-brand-blue">
                        {car.make} {car.model}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {car.year}
                      {car.color ? ` · ${car.color}` : ""}
                      {" · "}
                      {enums.carCondition(car.condition)}
                    </p>
                    <p className="mt-2 font-display text-xl font-bold text-brand-blue">
                      {formatMoney(car.salePrice, car.currency)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5" />
                        {new Intl.NumberFormat("ru-RU").format(car.mileage)} km
                      </span>
                      {car.fuelType && (
                        <span className="flex items-center gap-1">
                          <Fuel className="h-3.5 w-3.5" />
                          {enums.fuel(car.fuelType)}
                        </span>
                      )}
                      {car.transmission && (
                        <Badge className="border border-border bg-background text-[10px] text-muted-foreground">
                          {enums.transmission(car.transmission)}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <LinkButton href={`/showroom/${car.id}`} variant="outline" size="sm" className="flex-1">
                        {t("public.showroom.details")}
                      </LinkButton>
                      <LinkButton href={`/apply?car=${car.id}&source=instagram`} size="sm" className="flex-1">
                        {t("public.showroom.interested")}
                      </LinkButton>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
