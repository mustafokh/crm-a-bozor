"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Users, Plus, Pencil, Ban, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/components/language-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ROLES } from "@/lib/constants";
import { roleLabel } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

interface User {
  id: string; name: string; email: string; role: string;
  phone?: string | null; active: boolean; commissionRate: number;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [tab, setTab] = useState<"company" | "users">("company");

  // Company
  const [company, setCompany] = useState({
    name: "", address: "", phone: "", email: "", logo: "",
    usdRate: 12650, defaultCurrency: "USD", contractTemplate: "",
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [uForm, setUForm] = useState({ name: "", email: "", password: "", role: "MANAGER", phone: "", commissionRate: 0 });

  const loadCompany = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.settings) setCompany({ ...company, ...data.settings });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    setUsers((await res.json()).users ?? []);
  }, []);

  useEffect(() => { loadCompany(); loadUsers(); }, [loadCompany, loadUsers]);

  async function saveCompany() {
    setSavingCompany(true);
    const res = await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(company),
    });
    setSavingCompany(false);
    toast(res.ok ? t("settings.saved") : t("common.error"), res.ok ? "success" : "error");
  }

  function openNew() { setEditId(null); setUForm({ name: "", email: "", password: "", role: "MANAGER", phone: "", commissionRate: 0 }); setOpen(true); }
  function openEdit(u: User) {
    setEditId(u.id);
    setUForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone ?? "", commissionRate: u.commissionRate });
    setOpen(true);
  }
  async function saveUser() {
    if (!uForm.name || !uForm.email) return toast(t("settings.enterNameEmail"), "error");
    if (!editId && !uForm.password) return toast(t("settings.enterPassword"), "error");
    const res = await fetch(editId ? `/api/users/${editId}` : "/api/users", {
      method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uForm),
    });
    if (res.ok) { toast(editId ? t("settings.updated") : t("settings.userAdded")); setOpen(false); loadUsers(); }
    else toast((await res.json()).error || t("common.error"), "error");
  }
  async function toggleActive(u: User) {
    if (u.active) {
      await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: true }) });
    }
    toast(u.active ? t("settings.blocked") : t("settings.activated"));
    loadUsers();
  }

  return (
    <div>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />

      <div className="mb-4 flex gap-2 border-b border-border">
        <button onClick={() => setTab("company")} className={cn("flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium", tab === "company" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
          <Building2 className="h-4 w-4" /> {t("settings.company")}
        </button>
        <button onClick={() => setTab("users")} className={cn("flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium", tab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
          <Users className="h-4 w-4" /> {t("settings.users")}
        </button>
      </div>

      {tab === "company" ? (
        <Card>
          <CardHeader><CardTitle>{t("settings.companyInfo")}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>{t("settings.companyName")}</Label><Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></div>
              <div><Label>{t("col.phone")}</Label><Input value={company.phone ?? ""} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></div>
              <div><Label>{t("login.email")}</Label><Input value={company.email ?? ""} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>{t("col.address")}</Label><Input value={company.address ?? ""} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></div>
              <div><Label>{t("settings.companyLogo")}</Label><Input value={company.logo ?? ""} onChange={(e) => setCompany({ ...company, logo: e.target.value })} placeholder="https://..." /></div>
              <div>
                <Label>{t("settings.usdRate")}</Label>
                <Input type="number" value={company.usdRate} onChange={(e) => setCompany({ ...company, usdRate: +e.target.value })} />
              </div>
              <div>
                <Label>{t("settings.defaultCurrency")}</Label>
                <Select value={company.defaultCurrency} onChange={(e) => setCompany({ ...company, defaultCurrency: e.target.value })}>
                  <option value="USD">{t("settings.currencyUsd")}</option><option value="UZS">{t("settings.currencyUzs")}</option>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>{t("settings.contractTemplate")}</Label><Textarea value={company.contractTemplate ?? ""} onChange={(e) => setCompany({ ...company, contractTemplate: e.target.value })} /></div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={saveCompany} disabled={savingCompany}>{savingCompany ? t("common.saving") : t("common.save")}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("settings.usersAndRoles")}</CardTitle>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> {t("settings.addUser")}</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR><TH>{t("customers.fullName")}</TH><TH>{t("login.email")}</TH><TH>{t("settings.role")}</TH><TH>{t("settings.commission")}</TH><TH>{t("settings.status")}</TH><TH></TH></TR>
              </THead>
              <TBody>
                {users.map((u) => (
                  <TR key={u.id}>
                    <TD className="font-medium">{u.name}</TD>
                    <TD className="text-muted-foreground">{u.email}</TD>
                    <TD><Badge className="bg-accent text-accent-foreground">{roleLabel(t, u.role)}</Badge></TD>
                    <TD>{u.commissionRate}%</TD>
                    <TD><Badge className={cn(u.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{u.active ? t("settings.statusActive") : t("settings.statusBlocked")}</Badge></TD>
                    <TD>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className={cn("h-8 w-8", u.active ? "text-destructive" : "text-success")} onClick={() => toggleActive(u)}>
                          {u.active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t("settings.editUser") : t("settings.newUser")} className="max-w-md"
        footer={<><Button variant="outline" size="sm" onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button size="sm" onClick={saveUser}>{t("common.save")}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Label>{t("customers.fullName")}</Label><Input value={uForm.name} onChange={(e) => setUForm({ ...uForm, name: e.target.value })} /></div>
          <div className="col-span-2"><Label>{t("login.email")}</Label><Input value={uForm.email} disabled={!!editId} onChange={(e) => setUForm({ ...uForm, email: e.target.value })} /></div>
          <div className="col-span-2"><Label>{editId ? t("settings.newPasswordOptional") : t("settings.password")}</Label><Input type="password" value={uForm.password} onChange={(e) => setUForm({ ...uForm, password: e.target.value })} /></div>
          <div>
            <Label>{t("settings.role")}</Label>
            <Select value={uForm.role} onChange={(e) => setUForm({ ...uForm, role: e.target.value })}>
              {Object.keys(ROLES).map((k) => <option key={k} value={k}>{roleLabel(t, k)}</option>)}
            </Select>
          </div>
          <div><Label>{t("settings.commission")}</Label><Input type="number" step="0.5" value={uForm.commissionRate} onChange={(e) => setUForm({ ...uForm, commissionRate: +e.target.value })} /></div>
          <div className="col-span-2"><Label>{t("col.phone")}</Label><Input value={uForm.phone} onChange={(e) => setUForm({ ...uForm, phone: e.target.value })} /></div>
        </div>
      </Modal>
    </div>
  );
}
