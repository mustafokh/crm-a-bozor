"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Truck, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/components/language-provider";
import { useTranslatedEnums } from "@/lib/i18n/use-enums";
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
import { INCOMING_STATUS_COLOR, CAR_MAKES } from "@/lib/constants";
import { formatMoney, formatDate, cn } from "@/lib/utils";

interface Incoming {
  id: string;
  make: string;
  model: string;
  year: number;
  supplier?: string | null;
  expectedDate?: string | null;
  status: string;
  cost: number;
  currency: string;
  notes?: string | null;
  carId?: string | null;
}

const STEPS = ["ORDERED", "IN_TRANSIT", "CUSTOMS", "ARRIVED"];

export default function IncomingPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const enums = useTranslatedEnums();
  const [items, setItems] = useState<Incoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    make: "Chevrolet", model: "", year: new Date().getFullYear(),
    supplier: "", expectedDate: "", status: "ORDERED", cost: 0, currency: "USD", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/incoming");
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: string, status: string) {
    await fetch(`/api/incoming/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (status === "ARRIVED") toast(t("incoming.arrivedToast"));
    else toast(t("incoming.statusUpdated"));
    load();
  }

  async function create() {
    if (!form.model) return toast(t("incoming.enterModel"), "error");
    const res = await fetch("/api/incoming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast(t("incoming.added"));
      setOpen(false);
      setForm({ ...form, model: "", cost: 0, notes: "" });
      load();
    }
  }

  async function remove() {
    if (!deleteId) return;
    await fetch(`/api/incoming/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    toast(t("incoming.deleted"));
    load();
  }

  const counts = STEPS.map((s) => ({ s, n: items.filter((i) => i.status === s).length }));

  return (
    <div>
      <PageHeader
        title={t("incoming.title")}
        description={t("incoming.subtitleFull")}
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t("incoming.add")}</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {counts.map(({ s, n }) => (
          <Card key={s} className="p-4">
            <p className="text-xs text-muted-foreground">{enums.incomingStatus(s)}</p>
            <p className="mt-1 text-2xl font-bold">{n}</p>
          </Card>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={Truck} title={t("incoming.empty")} description={t("incoming.emptyDesc")} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("col.car")}</TH>
                <TH>{t("col.supplier")}</TH>
                <TH>{t("col.expectedDate")}</TH>
                <TH>{t("col.price")}</TH>
                <TH>{t("col.status")}</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {items.map((i) => (
                <TR key={i.id}>
                  <TD>
                    <div className="font-medium">{i.make} {i.model}</div>
                    <div className="text-xs text-muted-foreground">{i.year}</div>
                  </TD>
                  <TD className="text-muted-foreground">{i.supplier ?? "—"}</TD>
                  <TD>{formatDate(i.expectedDate)}</TD>
                  <TD>{formatMoney(i.cost, i.currency)}</TD>
                  <TD>
                    <Select
                      value={i.status}
                      onChange={(e) => changeStatus(i.id, e.target.value)}
                      className={cn("h-8 w-40 border-0 text-xs font-medium", INCOMING_STATUS_COLOR[i.status])}
                    >
                      {STEPS.map((s) => (
                        <option key={s} value={s}>{enums.incomingStatus(s)}</option>
                      ))}
                    </Select>
                  </TD>
                  <TD>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(i.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t("incoming.newModal")} className="max-w-lg"
        footer={<><Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button size="sm" onClick={create}>{t("common.save")}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t("common.make")}</Label>
            <Select value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })}>
              {CAR_MAKES.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </div>
          <div><Label>{t("common.model")}</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div><Label>{t("col.year")}</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} /></div>
          <div><Label>{t("col.supplier")}</Label><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></div>
          <div><Label>{t("col.expectedDate")}</Label><Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} /></div>
          <div>
            <Label>{t("col.price")}</Label>
            <div className="flex gap-2">
              <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: +e.target.value })} />
              <Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-24">
                <option>USD</option><option>UZS</option>
              </Select>
            </div>
          </div>
          <div className="col-span-2"><Label>{t("common.notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={remove}
        title={t("common.delete")} description={t("common.confirm")} />
    </div>
  );
}
