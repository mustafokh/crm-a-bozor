"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Printer, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/components/language-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";

const REPORT_TYPES = [
  { value: "sales", labelKey: "reports.type.sales" },
  { value: "finance", labelKey: "reports.type.finance" },
  { value: "employees", labelKey: "reports.type.employees" },
] as const;

export default function ReportsPage() {
  const { t } = useI18n();
  const [type, setType] = useState("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports?${params.toString()}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setTotals(data.totals ?? {});
    setLoading(false);
  }, [type, from, to]);

  useEffect(() => { load(); }, [load]);

  const columns = rows.length ? Object.keys(rows[0]) : [];

  function exportCsv() {
    if (!rows.length) return;
    const header = columns.join(",");
    const body = rows.map((r) => columns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const csv = "\uFEFF" + header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hisobot-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.subtitleFilter")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> {t("reports.print")}</Button>
            <Button onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" /> {t("reports.exportCsv")}</Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <Label>{t("reports.reportType")}</Label>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {REPORT_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{t(rt.labelKey)}</option>)}
              </Select>
            </div>
            <div><Label>{t("reports.from")}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label>{t("reports.to")}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={() => { setFrom(""); setTo(""); }}>{t("reports.clearFilter")}</Button>
            </div>
          </div>

          {Object.keys(totals).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
              {Object.entries(totals).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground capitalize">{k}: </span>
                  <span className="font-semibold">{new Intl.NumberFormat("ru-RU").format(v)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          {loading ? (
            <TableSkeleton cols={5} />
          ) : rows.length === 0 ? (
            <EmptyState icon={BarChart3} title={t("common.noData")} description={t("reports.emptyDesc")} />
          ) : (
            <Table>
              <THead>
                <TR>{columns.map((c) => <TH key={c}>{c}</TH>)}</TR>
              </THead>
              <TBody>
                {rows.map((r, i) => (
                  <TR key={i}>
                    {columns.map((c) => (
                      <TD key={c}>
                        {typeof r[c] === "number" ? new Intl.NumberFormat("ru-RU").format(r[c] as number) : r[c]}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
