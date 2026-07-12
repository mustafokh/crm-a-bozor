"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { useTranslatedEnums } from "@/lib/i18n/use-enums";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatMoney, formatDate, cn } from "@/lib/utils";

interface Contract {
  id: string;
  number: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  currency: string;
  paymentType: string;
  status: string;
  signedAt: string;
  customer: { fullName: string };
  deal: { car: { make: string; model: string; year: number }; user: { name: string } };
}

const CONTRACT_STATUS_KEYS = ["ACTIVE", "COMPLETED", "CANCELLED"];

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-primary/15 text-primary",
  COMPLETED: "bg-success/15 text-success",
  CANCELLED: "bg-destructive/15 text-destructive",
};

const PAGE_SIZE = 15;

export default function ContractsPage() {
  const { t } = useI18n();
  const enums = useTranslatedEnums();
  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const firstRun = useRef(true);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("status", status);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/contracts?${params.toString()}`);
    const data = await res.json();
    setRows(data.contracts ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [q, status, page]);

  useEffect(() => {
    if (firstRun.current) return;
    setPage(1);
  }, [q, status]);

  useEffect(() => {
    firstRun.current = false;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div>
      <PageHeader title={t("contracts.title")} description={t("contracts.subtitle")} />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("contracts.search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
            <option value="ALL">{t("inventory.allStatuses")}</option>
            {CONTRACT_STATUS_KEYS.map((k) => <option key={k} value={k}>{enums.contractStatus(k)}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-4"><TableSkeleton cols={6} /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} title={t("contracts.empty")} description={t("contracts.emptyDesc")} />
        ) : (
          <Table>
            <THead>
              <TR><TH>{t("col.number")}</TH><TH>{t("col.customer")}</TH><TH>{t("col.car")}</TH><TH>{t("col.payment")}</TH><TH>{t("col.amount")}</TH><TH>{t("col.paidRemaining")}</TH><TH>{t("common.date")}</TH><TH>{t("col.status")}</TH></TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/contracts/${c.id}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
                      <FileText className="h-4 w-4" /> {c.number}
                    </Link>
                  </TD>
                  <TD>{c.customer.fullName}</TD>
                  <TD className="text-muted-foreground">{c.deal.car.make} {c.deal.car.model}</TD>
                  <TD><Badge className="bg-accent text-accent-foreground">{enums.paymentType(c.paymentType)}</Badge></TD>
                  <TD className="font-medium">{formatMoney(c.totalAmount, c.currency)}</TD>
                  <TD>
                    <div className="text-xs">
                      <span className="text-success">{formatMoney(c.paidAmount, c.currency)}</span>
                      {c.remaining > 0 && (
                        <span className="text-muted-foreground"> / {t("contracts.remainingShort")} {formatMoney(c.remaining, c.currency)}</span>
                      )}
                    </div>
                    <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{ width: `${c.totalAmount > 0 ? Math.min(100, Math.round((c.paidAmount / c.totalAmount) * 100)) : 0}%` }}
                      />
                    </div>
                  </TD>
                  <TD className="text-muted-foreground">{formatDate(c.signedAt)}</TD>
                  <TD><Badge className={cn(STATUS_COLOR[c.status])}>{enums.contractStatus(c.status)}</Badge></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {!loading && total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.pagination", { total, page, totalPages })}
          </p>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> {t("common.previous")}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              {t("common.next")} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
