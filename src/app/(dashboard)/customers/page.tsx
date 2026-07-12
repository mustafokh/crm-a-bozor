"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  Star,
  Phone,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
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
import { formatDate, initials, cn } from "@/lib/utils";
import { validateCustomer, hasErrors, type Errors } from "@/lib/validation";

interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  passportSeries?: string | null;
  address?: string | null;
  isVip: boolean;
  notes?: string | null;
  createdAt: string;
  _count: { deals: number };
}

const empty = { fullName: "", phone: "", email: "", passportSeries: "", address: "", isVip: false, notes: "" };
const PAGE_SIZE = 15;

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [vipOnly, setVipOnly] = useState(false);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const firstRun = useRef(true);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (vipOnly) params.set("vip", "1");
    params.set("sort", sort);
    params.set("order", order);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/customers?${params.toString()}`);
    const data = await res.json();
    setRows(data.customers ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [q, vipOnly, sort, order, page]);

  useEffect(() => {
    if (firstRun.current) return;
    setPage(1);
  }, [q, vipOnly, sort, order]);

  useEffect(() => {
    firstRun.current = false;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function toggleSort(field: string) {
    if (sort === field) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(field);
      setOrder("asc");
    }
  }

  function setField(k: keyof typeof empty, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }
  const invalid = (k: string) => (errors[k] ? "border-destructive focus-visible:ring-destructive" : "");

  function openNew() { setEditId(null); setForm(empty); setErrors({}); setOpen(true); }
  function openEdit(c: Customer) {
    setEditId(c.id);
    setForm({
      fullName: c.fullName, phone: c.phone, email: c.email ?? "",
      passportSeries: c.passportSeries ?? "", address: c.address ?? "",
      isVip: c.isVip, notes: c.notes ?? "",
    });
    setErrors({});
    setOpen(true);
  }

  async function save() {
    const errs = validateCustomer(form);
    if (hasErrors(errs)) {
      setErrors(errs);
      toast("Formadagi xatolarni tuzating", "error");
      return;
    }
    setSaving(true);
    const res = await fetch(editId ? `/api/customers/${editId}` : "/api/customers", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      toast(editId ? "Yangilandi" : "Mijoz qo'shildi");
      setOpen(false);
      load();
    } else {
      const d = await res.json();
      if (d.fields) setErrors(d.fields);
      toast(d.error || "Xatolik", "error");
    }
  }

  async function remove() {
    if (!deleteId) return;
    const res = await fetch(`/api/customers/${deleteId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) toast(data.error, "error");
    else { toast("O'chirildi"); load(); }
    setDeleteId(null);
  }

  function SortTH({ label, field }: { label: string; field: string }) {
    const active = sort === field;
    return (
      <TH>
        <button
          onClick={() => toggleSort(field)}
          className={cn("flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
        >
          {label}
          {active ? (
            order === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
          )}
        </button>
      </TH>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("customers.title")}
        description={t("customers.subtitle")}
        action={<Button onClick={openNew}><Plus className="h-4 w-4" /> {t("customers.add")}</Button>}
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("customers.search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSort(s);
              setOrder(o as "asc" | "desc");
            }}
            className="sm:w-52"
          >
            <option value="createdAt:desc">{t("common.sort.newest")}</option>
            <option value="createdAt:asc">{t("common.sort.oldest")}</option>
            <option value="fullName:asc">{t("common.sort.nameAsc")}</option>
            <option value="fullName:desc">{t("common.sort.nameDesc")}</option>
          </Select>
          <button
            onClick={() => setVipOnly((v) => !v)}
            className={cn(
              "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
              vipOnly
                ? "border-warning/50 bg-warning/10 text-warning"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Star className={cn("h-4 w-4", vipOnly && "fill-warning")} /> {t("customers.vip")}
          </button>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-4"><TableSkeleton cols={5} /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Users} title={t("customers.empty")} action={<Button onClick={openNew}><Plus className="h-4 w-4" /> {t("customers.add")}</Button>} />
        ) : (
          <Table>
            <THead>
              <TR>
                <SortTH label={t("col.customer")} field="fullName" />
                <TH>{t("col.phone")}</TH>
                <TH>{t("col.address")}</TH>
                <TH>{t("col.deals")}</TH>
                <SortTH label={t("col.added")} field="createdAt" />
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(c.fullName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-medium hover:text-primary">
                          {c.fullName}
                          {c.isVip && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
                      </div>
                    </Link>
                  </TD>
                  <TD>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </span>
                  </TD>
                  <TD className="text-muted-foreground">{c.address ?? "—"}</TD>
                  <TD><Badge className="bg-primary/10 text-primary">{t("customers.dealsCount", { count: c._count.deals })}</Badge></TD>
                  <TD className="text-muted-foreground">{formatDate(c.createdAt)}</TD>
                  <TD>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
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

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t("customers.edit") : t("customers.new")} className="max-w-lg"
        footer={<><Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>{t("common.cancel")}</Button><Button size="sm" onClick={save} disabled={saving}>{saving ? t("common.saving") : t("common.save")}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>{t("customers.fullName")} *</Label>
            <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} className={invalid("fullName")} />
            <ErrText msg={errors.fullName} />
          </div>
          <div>
            <Label>{t("col.phone")} *</Label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+998 90 123 45 67" className={invalid("phone")} />
            <ErrText msg={errors.phone} />
          </div>
          <div>
            <Label>{t("login.email")}</Label>
            <Input value={form.email} onChange={(e) => setField("email", e.target.value)} className={invalid("email")} />
            <ErrText msg={errors.email} />
          </div>
          <div>
            <Label>{t("customers.passport")}</Label>
            <Input value={form.passportSeries} onChange={(e) => setField("passportSeries", e.target.value)} placeholder="AA 1234567" className={invalid("passportSeries")} />
            <ErrText msg={errors.passportSeries} />
          </div>
          <div>
            <Label>{t("col.address")}</Label>
            <Input value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>{t("customers.notes")}</Label>
            <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isVip} onChange={(e) => setField("isVip", e.target.checked)} className="h-4 w-4 rounded border-input" />
            {t("customers.vipMark")}
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove}
        title={t("customers.deleteTitle")} description={t("customers.deleteDesc")} />
    </div>
  );
}
