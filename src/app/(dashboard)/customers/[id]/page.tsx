import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Phone, Mail, MapPin, CreditCard, Car } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddNote } from "@/components/customers/add-note";
import { formatMoney, formatDate, timeAgo, initials } from "@/lib/utils";
import { getServerT } from "@/lib/i18n/server";
import { paymentTypeLabel } from "@/lib/i18n/labels";

export default async function CustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t } = await getServerT();
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      deals: { include: { car: true, user: true }, orderBy: { createdAt: "desc" } },
      activityLogs: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.deals.reduce((s, d) => s + d.price, 0);

  return (
    <div>
      <Link href="/customers">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Button>
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {initials(customer.fullName)}
              </div>
              <h1 className="mt-3 flex items-center justify-center gap-2 text-xl font-bold">
                {customer.fullName}
                {customer.isVip && <Star className="h-5 w-5 fill-warning text-warning" />}
              </h1>
              {customer.isVip && <Badge className="mt-1 bg-warning/15 text-warning">{t("customerDetail.vipBadge")}</Badge>}

              <div className="mt-5 space-y-3 text-left text-sm">
                <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /> {customer.phone}</div>
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /> {customer.email ?? "—"}</div>
                <div className="flex items-center gap-3"><CreditCard className="h-4 w-4 text-muted-foreground" /> {customer.passportSeries ?? "—"}</div>
                <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-muted-foreground" /> {customer.address ?? "—"}</div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                <div><p className="text-2xl font-bold">{customer.deals.length}</p><p className="text-xs text-muted-foreground">{t("col.deals")}</p></div>
                <div><p className="text-2xl font-bold text-primary">{formatMoney(totalSpent, "USD", { compact: true })}</p><p className="text-xs text-muted-foreground">{t("customerDetail.totalSpent")}</p></div>
              </div>
            </CardContent>
          </Card>

          {customer.notes && (
            <Card>
              <CardHeader><CardTitle>{t("customers.notes")}</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{customer.notes}</p></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>{t("customerDetail.purchasedCars")}</CardTitle></CardHeader>
            <CardContent>
              {customer.deals.length ? (
                <div className="space-y-3">
                  {customer.deals.map((d) => (
                    <Link key={d.id} href={`/inventory/${d.carId}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><Car className="h-5 w-5" /></div>
                        <div>
                          <p className="font-medium">{d.car.make} {d.car.model}</p>
                          <p className="text-xs text-muted-foreground">{paymentTypeLabel(t, d.paymentType)} · {formatDate(d.createdAt)}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-primary">{formatMoney(d.price, d.currency)}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("customerDetail.noDeals")}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t("customerDetail.contactHistory")}</CardTitle></CardHeader>
            <CardContent>
              <AddNote customerId={customer.id} />
              <div className="mt-4 space-y-3">
                {customer.activityLogs.length ? customer.activityLogs.map((a) => (
                  <div key={a.id} className="flex gap-3 border-l-2 border-border pl-4">
                    <div className="flex-1">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground">{a.user?.name ?? t("common.system")} · {timeAgo(a.createdAt)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">{t("customerDetail.noContacts")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
