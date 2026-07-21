import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gallery } from "@/components/inventory/gallery";
import { CAR_STATUS_COLOR } from "@/lib/constants";
import { formatMoney, formatDate, formatDateTime, cn } from "@/lib/utils";
import { getServerT } from "@/lib/i18n/server";
import {
  carStatusLabel,
  carConditionLabel,
  transmissionEnumLabel,
  fuelTypeLabel,
  drivetrainLabel,
  carColorLabel,
} from "@/lib/i18n/labels";

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getServerT();
  const { id } = await params;
  const car = await prisma.car.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      priceHistory: { orderBy: { createdAt: "desc" } },
      deals: { include: { customer: true, user: true } },
    },
  });
  if (!car) notFound();

  const profit = car.salePrice - car.purchasePrice;
  const specs: { label: string; value: string }[] = [
    { label: t("col.year"), value: String(car.year) },
    { label: t("public.showroom.color"), value: car.color ? carColorLabel(t, car.color) : "—" },
    { label: t("col.mileage"), value: `${new Intl.NumberFormat("ru-RU").format(car.mileage)} km` },
    { label: t("col.condition"), value: carConditionLabel(t, car.condition) },
    { label: t("inventoryDetail.engine"), value: car.engineVolume ? `${car.engineVolume} L` : "—" },
    { label: t("public.showroom.transmission"), value: car.transmission ? transmissionEnumLabel(t, car.transmission) : "—" },
    { label: t("public.showroom.fuel"), value: car.fuelType ? fuelTypeLabel(t, car.fuelType) : "—" },
    { label: t("inventoryDetail.drivetrain"), value: car.drivetrain ? drivetrainLabel(t, car.drivetrain) : "—" },
    { label: "VIN", value: car.vin ?? "—" },
    { label: t("inventoryDetail.bodyNumber"), value: car.bodyNumber ?? "—" },
    { label: t("col.supplier"), value: car.supplier ?? "—" },
    { label: t("inventoryDetail.arrivedAt"), value: formatDate(car.arrivedAt) },
  ];

  return (
    <div>
      <Link href="/inventory">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Button>
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Gallery images={car.images} />

          <Card>
            <CardHeader>
              <CardTitle>{t("inventoryDetail.specs")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                {specs.map((s) => (
                  <div key={s.label}>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-medium">{s.value}</p>
                  </div>
                ))}
              </div>
              {car.description && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">{t("common.description")}</p>
                  <p className="mt-1 text-sm">{car.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {car.priceHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-4 w-4" /> {t("inventoryDetail.priceHistory")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {car.priceHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatDateTime(h.createdAt)} · {h.changedBy ?? "—"}
                      </span>
                      <span>
                        {formatMoney(h.oldPrice, car.currency)} →{" "}
                        <span className="font-medium">{formatMoney(h.newPrice, car.currency)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">
                  {car.make} {car.model}
                </h1>
                <Badge className={cn(CAR_STATUS_COLOR[car.status])}>
                  {carStatusLabel(t, car.status)}
                </Badge>
              </div>
              <p className="mt-4 text-3xl font-bold text-primary">
                {formatMoney(car.salePrice, car.currency)}
              </p>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("deals.purchasePrice")}</span>
                  <span className="font-medium">{formatMoney(car.purchasePrice, car.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("deals.expectedProfit")}</span>
                  <span className={cn("flex items-center gap-1 font-semibold", profit >= 0 ? "text-success" : "text-destructive")}>
                    <TrendingUp className="h-3.5 w-3.5" />
                    {formatMoney(profit, car.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {car.deals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("inventoryDetail.salesHistory")}</CardTitle>
              </CardHeader>
              <CardContent>
                {car.deals.map((d) => (
                  <div key={d.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-medium">{d.customer.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("inventoryDetail.sellerLine", { name: d.user.name })} · {formatDate(d.createdAt)}
                    </p>
                    <p className="mt-1 font-semibold text-primary">
                      {formatMoney(d.price, d.currency)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
