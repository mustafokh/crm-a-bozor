import { Trophy, Users, Handshake, Filter, Percent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { BarsChart } from "@/components/charts";
import { WhatsAppSessionsPanel } from "@/components/employees/whatsapp-sessions-panel";
import { TelegramSessionsPanel } from "@/components/employees/telegram-sessions-panel";
import { employeeKpis } from "@/lib/analytics";
import type { Role } from "@/lib/constants";
import { formatMoney, initials, cn } from "@/lib/utils";
import { getServerT } from "@/lib/i18n/server";

export default async function EmployeesPage() {
  const { t } = await getServerT();
  const rows = await employeeKpis();

  const totalDeals = rows.reduce((s, r) => s + r.dealCount, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leadCount, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commissionTotal, 0);
  const chartData = rows.map((r) => ({ name: r.name.split(" ")[0], value: Math.round(r.revenue) }));

  return (
    <div>
      <PageHeader title={t("employees.title")} description={t("employees.subtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("employees.title")} value={rows.length} icon={Users} accent="primary" />
        <StatCard title={t("nav.deals")} value={totalDeals} icon={Handshake} accent="success" />
        <StatCard title={t("nav.leads")} value={totalLeads} icon={Filter} accent="warning" />
        <StatCard title={t("finance.commissions")} value={formatMoney(totalCommission, "USD", { compact: true })} icon={Percent} accent="primary" />
      </div>

      <WhatsAppSessionsPanel />
      <TelegramSessionsPanel />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Savdo bo'yicha reyting</CardTitle></CardHeader>
          <CardContent>
            {chartData.length ? <BarsChart data={chartData} dataKey="value" color="hsl(217 100% 68%)" /> : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Xodimlar samaradorligi</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR><TH>#</TH><TH>Xodim</TH><TH>Lidlar</TH><TH>Savdolar</TH><TH>Konversiya</TH><TH>Tushum</TH><TH>Komissiya</TH></TR>
              </THead>
              <TBody>
                {rows.map((r, i) => (
                  <TR key={r.id}>
                    <TD>
                      {i === 0 ? <Trophy className="h-4 w-4 text-warning" /> : <span className="text-muted-foreground">{i + 1}</span>}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials(r.name)}</div>
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <Badge className="bg-accent text-accent-foreground text-[10px]">{t(`enum.role.${r.role as Role}`)}</Badge>
                        </div>
                      </div>
                    </TD>
                    <TD>{r.leadCount}</TD>
                    <TD className="font-medium">{r.dealCount}</TD>
                    <TD>
                      <span className={cn("font-medium", r.conversion >= 30 ? "text-success" : r.conversion >= 15 ? "text-warning" : "text-muted-foreground")}>
                        {r.conversion}%
                      </span>
                    </TD>
                    <TD className="font-medium">{formatMoney(r.revenue, "USD", { compact: true })}</TD>
                    <TD>{formatMoney(r.commissionTotal, "USD", { compact: true })}</TD>
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
