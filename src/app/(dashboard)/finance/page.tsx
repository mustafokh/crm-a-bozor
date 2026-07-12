import { TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DualLine, DonutChart } from "@/components/charts";
import { ExpenseManager } from "@/components/finance/expense-manager";
import { financeSummary, monthlyFinanceSeries } from "@/lib/analytics";
import { formatMoney, cn } from "@/lib/utils";
import { getServerT } from "@/lib/i18n/server";

export default async function FinancePage() {
  const { t } = await getServerT();

  const [summary, series, commissions] = await Promise.all([
    financeSummary(),
    monthlyFinanceSeries(6),
    prisma.commission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
        deal: { include: { car: { select: { make: true, model: true } } } },
      },
      take: 15,
    }),
  ]);

  const donut = Object.entries(summary.byCategory).map(([k, v]) => ({
    name: t(`enum.expenseCategory.${k}`) || k,
    value: Math.round(v),
  }));

  const rateFmt = new Intl.NumberFormat("ru-RU").format(summary.rate);

  return (
    <div>
      <PageHeader
        title={t("finance.title")}
        description={t("finance.rateHint", { rate: rateFmt })}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("finance.totalIncome")} value={formatMoney(summary.totalIncome, "USD", { compact: true })} icon={TrendingUp} accent="success" />
        <StatCard title={t("finance.totalExpense")} value={formatMoney(summary.totalExpenses, "USD", { compact: true })} icon={TrendingDown} accent="destructive" />
        <StatCard title={t("finance.netProfit")} value={formatMoney(summary.netProfit, "USD", { compact: true })} icon={Wallet} accent="primary" />
        <StatCard title={t("finance.pendingCommission")} value={formatMoney(summary.pendingCommissions, "USD", { compact: true })} icon={Percent} accent="warning" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("finance.monthlyTrend")}</CardTitle></CardHeader>
          <CardContent>
            <DualLine data={series} keys={[
              { key: "income", color: "#1254BE", label: t("finance.income") },
              { key: "expense", color: "#E0242A", label: t("finance.expense") },
            ]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("finance.byCategory")}</CardTitle></CardHeader>
          <CardContent>
            {donut.length ? <DonutChart data={donut} /> : <p className="py-12 text-center text-sm text-muted-foreground">{t("common.noData")}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpenseManager />

        <Card>
          <CardHeader><CardTitle>{t("finance.commissions")}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR><TH>{t("nav.employees")}</TH><TH>{t("nav.deals")}</TH><TH>%</TH><TH>{t("common.amount")}</TH><TH>{t("common.status")}</TH></TR>
              </THead>
              <TBody>
                {commissions.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">{c.user.name}</TD>
                    <TD className="text-muted-foreground">{c.deal.car.make} {c.deal.car.model}</TD>
                    <TD>{c.rate}%</TD>
                    <TD className="font-medium">{formatMoney(c.amount, c.currency)}</TD>
                    <TD>
                      <Badge className={cn(c.status === "PAID" ? "bg-success/15 text-success" : "bg-warning/15 text-warning")}>
                        {t(`enum.commissionStatus.${c.status}`)}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
