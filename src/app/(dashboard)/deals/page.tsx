"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Handshake, FileText, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { useTranslatedEnums } from "@/lib/i18n/use-enums";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatMoney, formatDate, cn } from "@/lib/utils";

interface Deal {
  id: string;
  price: number;
  currency: string;
  paymentType: string;
  status: string;
  profit: number;
  createdAt: string;
  customer: { fullName: string };
  car: { make: string; model: string; year: number };
  user: { name: string };
  contract?: { id: string; number: string } | null;
}

interface Meta {
  customers: { id: string; fullName: string; phone: string }[];
  sellers: { id: string; name: string }[];
  cars: { id: string; make: string; model: string; year: number; salePrice: number; currency: string; purchasePrice: number }[];
}

const DEAL_STATUS_KEYS = ["ACTIVE", "COMPLETED", "CANCELLED"];
const PAYMENT_TYPE_KEYS = ["CASH", "CREDIT", "INSTALLMENT", "TRADEIN"];

const DEAL_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-primary/15 text-primary",
  COMPLETED: "bg-success/15 text-success",
  CANCELLED: "bg-destructive/15 text-destructive",
};

const PAGE_SIZE = 15;

export default function DealsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const enums = useTranslatedEnums();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [meta, setMeta] = useState<Meta>({ customers: [], sellers: [], cars: [] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({
    carId: "", customerId: "", userId: "", price: 0, currency: "USD",
    paymentType: "CASH", installmentMonths: 12, tradeInValue: 0, tradeInInfo: "",
    extraCosts: 0, notes: "",
  });

  const firstRun = useRef(true);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status !== "ALL") params.set("status", status);
    if (paymentFilter !== "ALL") params.set("paymentType", paymentFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const dRes = await fetch(`/api/deals?${params.toString()}`);
    const dData = await dRes.json();
    setDeals(dData.deals ?? []);
    setTotal(dData.total ?? 0);
    setLoading(false);
  }, [q, status, paymentFilter, page]);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((m) =>
        setMeta({
          customers: m.customers ?? [],
          sellers: m.sellers ?? [],
          cars: m.cars ?? [],
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (firstRun.current) return;
    setPage(1);
  }, [q, status, paymentFilter]);

  useEffect(() => {
    firstRun.current = false;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const selectedCar = meta.cars.find((c) => c.id === form.carId);
  const profit = (Number(form.price) || 0) - (selectedCar?.purchasePrice ?? 0) - (Number(form.extraCosts) || 0);

  async function save() {
    if (!form.carId || !form.customerId) return toast("Mashina va mijozni tanlang", "error");
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { toast("Savdo yaratildi"); setOpen(false); load(); }
    else toast((await res.json()).error || "Xatolik", "error");
  }

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/deals/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast("Status yangilandi");
    load();
  }

  async function remove() {
    if (!deleteId) return;
    const res = await fetch(`/api/deals/${deleteId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) toast(data.error, "error");
    else { toast("O'chirildi"); load(); }
    setDeleteId(null);
  }

  return (
    <div>
      <PageHeader
        title={t("deals.title")}
        description={t("deals.subtitle")}
        action={<Button onClick={() => { setForm({ ...form, carId: "", customerId: "", price: 0 }); setOpen(true); }}><Plus className="h-4 w-4" /> {t("deals.add")}</Button>}
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("deals.search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
            <option value="ALL">{t("inventory.allStatuses")}</option>
            {DEAL_STATUS_KEYS.map((k) => <option key={k} value={k}>{enums.dealStatus(k)}</option>)}
          </Select>
          <Select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="sm:w-44">
            <option value="ALL">{t("common.allPaymentTypes")}</option>
            {PAYMENT_TYPE_KEYS.map((k) => <option key={k} value={k}>{enums.paymentType(k)}</option>)}
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-4"><TableSkeleton cols={6} /></div>
        ) : deals.length === 0 ? (
          <EmptyState icon={Handshake} title={t("deals.empty")} description={t("deals.emptyDesc")} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("col.car")}</TH><TH>{t("col.customer")}</TH><TH>{t("col.seller")}</TH><TH>{t("col.payment")}</TH><TH>{t("col.price")}</TH><TH>{t("col.profit")}</TH><TH>{t("col.status")}</TH><TH>{t("col.contract")}</TH><TH></TH>
              </TR>
            </THead>
            <TBody>
              {deals.map((d) => (
                <TR key={d.id}>
                  <TD><div className="font-medium">{d.car.make} {d.car.model}</div><div className="text-xs text-muted-foreground">{d.car.year} · {formatDate(d.createdAt)}</div></TD>
                  <TD>{d.customer.fullName}</TD>
                  <TD className="text-muted-foreground">{d.user.name}</TD>
                  <TD><Badge className="bg-accent text-accent-foreground">{enums.paymentType(d.paymentType)}</Badge></TD>
                  <TD className="font-medium">{formatMoney(d.price, d.currency)}</TD>
                  <TD className={cn("font-medium", d.profit >= 0 ? "text-success" : "text-destructive")}>{formatMoney(d.profit, d.currency)}</TD>
                  <TD>
                    <Select value={d.status} onChange={(e) => changeStatus(d.id, e.target.value)} className={cn("h-8 w-32 border-0 text-xs font-medium", DEAL_STATUS_COLOR[d.status])}>
                      {DEAL_STATUS_KEYS.map((k) => <option key={k} value={k}>{enums.dealStatus(k)}</option>)}
                    </Select>
                  </TD>
                  <TD>
                    {d.contract ? (
                      <Link href={`/contracts/${d.contract.id}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <FileText className="h-3.5 w-3.5" /> {d.contract.number}
                      </Link>
                    ) : "—"}
                  </TD>
                  <TD>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TD>
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

      <Modal open={open} onClose={() => setOpen(false)} title={t("deals.newModal")} className="max-w-2xl"
        footer={<><Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button size="sm" onClick={save}>{t("deals.create")}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>{t("col.car")}</Label>
            <Select value={form.carId} onChange={(e) => {
              const car = meta.cars.find((c) => c.id === e.target.value);
              setForm({ ...form, carId: e.target.value, price: car?.salePrice ?? 0, currency: car?.currency ?? "USD" });
            }}>
              <option value="">{t("common.select")}</option>
              {meta.cars.map((c) => <option key={c.id} value={c.id}>{c.make} {c.model} ({c.year}) — {formatMoney(c.salePrice, c.currency)}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t("col.customer")}</Label>
            <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">{t("common.select")}</option>
              {meta.customers.map((c) => <option key={c.id} value={c.id}>{c.fullName} — {c.phone}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t("col.seller")}</Label>
            <Select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
              <option value="">{t("deals.autoSeller")}</option>
              {meta.sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>{t("deals.salePrice")}</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
          </div>
          <div>
            <Label>{t("col.payment")}</Label>
            <Select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}>
              {PAYMENT_TYPE_KEYS.map((k) => <option key={k} value={k}>{enums.paymentType(k)}</option>)}
            </Select>
          </div>
          {form.paymentType === "INSTALLMENT" && (
            <div>
              <Label>{t("deals.installmentMonths")}</Label>
              <Input type="number" value={form.installmentMonths} onChange={(e) => setForm({ ...form, installmentMonths: +e.target.value })} />
            </div>
          )}
          {form.paymentType === "TRADEIN" && (
            <>
              <div><Label>{t("deals.tradeInValue")}</Label><Input type="number" value={form.tradeInValue} onChange={(e) => setForm({ ...form, tradeInValue: +e.target.value })} /></div>
              <div><Label>{t("deals.tradeInInfo")}</Label><Input value={form.tradeInInfo} onChange={(e) => setForm({ ...form, tradeInInfo: e.target.value })} placeholder="Nexia 3, 2019" /></div>
            </>
          )}
          <div><Label>{t("deals.extraCosts")}</Label><Input type="number" value={form.extraCosts} onChange={(e) => setForm({ ...form, extraCosts: +e.target.value })} /></div>
          <div className="col-span-2"><Label>{t("common.notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

          {selectedCar && (
            <div className="col-span-2 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("deals.purchasePrice")}</span><span>{formatMoney(selectedCar.purchasePrice, form.currency)}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted-foreground">{t("deals.expectedProfit")}</span><span className={cn("font-semibold", profit >= 0 ? "text-success" : "text-destructive")}>{formatMoney(profit, form.currency)}</span></div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove}
        title={t("deals.deleteTitle")} description={t("deals.deleteDesc")} />
    </div>
  );
}
