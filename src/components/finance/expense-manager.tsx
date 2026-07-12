"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Receipt, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { EXPENSE_CATEGORY } from "@/lib/constants";
import { formatMoney, formatDate } from "@/lib/utils";
import { validateExpense, hasErrors, type Errors } from "@/lib/validation";

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  description?: string | null;
  date: string;
  createdBy?: { name: string } | null;
}

const PAGE_SIZE = 10;

const emptyForm = () => ({
  category: "OTHER",
  amount: "" as number | string,
  currency: "UZS",
  description: "",
  date: new Date().toISOString().slice(0, 10),
});

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

export function ExpenseManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Expense[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [category, setCategory] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState(emptyForm());

  const firstRun = useRef(true);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (category !== "ALL") params.set("category", category);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/expenses?${params.toString()}`);
    const data = await res.json();
    setRows(data.expenses ?? []);
    setTotal(data.total ?? 0);
  }, [category, from, to, page]);

  useEffect(() => {
    if (firstRun.current) return;
    setPage(1);
  }, [category, from, to]);

  useEffect(() => {
    firstRun.current = false;
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  function setField(k: keyof ReturnType<typeof emptyForm>, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  function openNew() {
    setEditId(null);
    setForm(emptyForm());
    setErrors({});
    setOpen(true);
  }

  function openEdit(e: Expense) {
    setEditId(e.id);
    setForm({
      category: e.category,
      amount: e.amount,
      currency: e.currency,
      description: e.description ?? "",
      date: e.date.slice(0, 10),
    });
    setErrors({});
    setOpen(true);
  }

  async function save() {
    const errs = validateExpense(form);
    if (hasErrors(errs)) {
      setErrors(errs);
      toast("Formadagi xatolarni tuzating", "error");
      return;
    }
    const res = await fetch(editId ? `/api/expenses/${editId}` : "/api/expenses", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast(editId ? "Xarajat yangilandi" : "Xarajat qo'shildi");
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
    await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    toast("O'chirildi");
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Xarajatlar</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Qo'shish</Button>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-44">
            <option value="ALL">Barcha kategoriyalar</option>
            {Object.entries(EXPENSE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-40" />
          <span className="hidden text-sm text-muted-foreground sm:block">—</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-40" />
          {(category !== "ALL" || from || to) && (
            <Button variant="ghost" size="sm" onClick={() => { setCategory("ALL"); setFrom(""); setTo(""); }}>
              Tozalash
            </Button>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="Xarajat topilmadi" />
        ) : (
          <Table>
            <THead>
              <TR><TH>Sana</TH><TH>Kategoriya</TH><TH>Tavsif</TH><TH>Kim</TH><TH>Summa</TH><TH></TH></TR>
            </THead>
            <TBody>
              {rows.map((e) => (
                <TR key={e.id}>
                  <TD className="text-muted-foreground">{formatDate(e.date)}</TD>
                  <TD><Badge className="bg-accent text-accent-foreground">{EXPENSE_CATEGORY[e.category]}</Badge></TD>
                  <TD>{e.description ?? "—"}</TD>
                  <TD className="text-muted-foreground">{e.createdBy?.name ?? "—"}</TD>
                  <TD className="font-medium">{formatMoney(e.amount, e.currency)}</TD>
                  <TD>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {total > PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Jami {total} ta · {page}/{totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? "Xarajatni tahrirlash" : "Yangi xarajat"} className="max-w-md"
        footer={<><Button variant="outline" size="sm" onClick={() => setOpen(false)}>Bekor</Button><Button size="sm" onClick={save}>Saqlash</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Kategoriya</Label>
            <Select value={form.category} onChange={(e) => setField("category", e.target.value)}>
              {Object.entries(EXPENSE_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <ErrText msg={errors.category} />
          </div>
          <div>
            <Label>Sana</Label>
            <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
            <ErrText msg={errors.date} />
          </div>
          <div>
            <Label>Summa *</Label>
            <div className="flex gap-2">
              <Input type="number" value={form.amount} onChange={(e) => setField("amount", e.target.value)} className={errors.amount ? "border-destructive" : ""} />
              <Select value={form.currency} onChange={(e) => setField("currency", e.target.value)} className="w-24"><option>UZS</option><option>USD</option></Select>
            </div>
            <ErrText msg={errors.amount} />
          </div>
          <div className="col-span-2"><Label>Tavsif</Label><Input value={form.description} onChange={(e) => setField("description", e.target.value)} /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove} title="Xarajatni o'chirish" description="Davom etasizmi?" />
    </Card>
  );
}
