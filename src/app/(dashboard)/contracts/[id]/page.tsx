import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Car, Calendar, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentSchedule } from "@/components/contracts/payment-schedule";
import { PrintButton } from "@/components/contracts/print-button";
import { CONTRACT_STATUS, PAYMENT_TYPE } from "@/lib/constants";
import { formatMoney, formatDate, cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-primary/15 text-primary",
  COMPLETED: "bg-success/15 text-success",
  CANCELLED: "bg-destructive/15 text-destructive",
};

export default async function ContractDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      customer: true,
      payments: { orderBy: { dueDate: "asc" } },
      deal: { include: { car: true, user: true } },
    },
  });
  if (!contract) notFound();

  const info = [
    { icon: User, label: "Mijoz", value: contract.customer.fullName },
    { icon: Car, label: "Mashina", value: `${contract.deal.car.make} ${contract.deal.car.model} (${contract.deal.car.year})` },
    { icon: CreditCard, label: "To'lov turi", value: PAYMENT_TYPE[contract.paymentType] },
    { icon: Calendar, label: "Imzolangan", value: formatDate(contract.signedAt) },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/contracts">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Orqaga</Button>
        </Link>
        <PrintButton contractId={contract.id} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shartnoma {contract.number}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Savdo shartnomasi hujjati</p>
                </div>
                <Badge className={cn(STATUS_COLOR[contract.status])}>{CONTRACT_STATUS[contract.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {info.map((it) => (
                  <div key={it.label} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><it.icon className="h-4 w-4 text-muted-foreground" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">{it.label}</p>
                      <p className="text-sm font-medium">{it.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-muted-foreground">Umumiy summa</span>
                <span className="text-2xl font-bold text-primary">{formatMoney(contract.totalAmount, contract.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {contract.payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>To'lov jadvali</CardTitle></CardHeader>
              <CardContent><PaymentSchedule payments={contract.payments.map((p) => ({ ...p, dueDate: p.dueDate?.toISOString() ?? null, paidDate: p.paidDate?.toISOString() ?? null }))} /></CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Ma'lumot</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sotuvchi</span><span>{contract.deal.user.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Telefon</span><span>{contract.customer.phone}</span></div>
              {contract.installmentMonths && (
                <div className="flex justify-between"><span className="text-muted-foreground">Muddat</span><span>{contract.installmentMonths} oy</span></div>
              )}
              {contract.deal.tradeInValue > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Trade-in</span><span>{formatMoney(contract.deal.tradeInValue, contract.currency)}</span></div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
