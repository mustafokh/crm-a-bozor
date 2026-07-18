"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, Phone, Trash2, Pencil, MessageSquare, History, Search, User,
} from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { PageHeader } from "@/components/page-header";
import { PublicLinksCard } from "@/components/public/public-links-card";
import { TalkFields, emptyTalkForm, talkFormFromRecord } from "@/components/leads/talk-fields";
import { TalkRecordCard, type TalkRecord } from "@/components/leads/talk-record-card";
import {
  CallHistoryCard,
  CallTranscriptBlock,
  DirectionBadge,
  ListenAudioLink,
  transmissionLabel,
  type CallHistoryItem,
  type LatestCallInfo,
} from "@/components/leads/call-extras";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { CarColorBadge } from "@/components/ui/car-color-badge";
import { CountryBadge } from "@/components/ui/country-badge";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  LEAD_SOURCE, LEAD_OUTCOMES, LEAD_OUTCOME_COLOR, COUNTRY_OPTIONS, CAR_COLOR_OPTIONS,
  CHANNEL_SOURCES, CHANNEL_COLOR,
} from "@/lib/constants";
import { detectCountryFromPhone } from "@/lib/country-display";
import { formatCarShort } from "@/lib/lead-helpers";
import { formatDateTime, cn } from "@/lib/utils";
import { validateLead, hasErrors, type Errors } from "@/lib/validation";

interface Lead extends TalkRecord {
  id: string;
  fullName: string;
  phone: string;
  country?: string | null;
  source: string;
  status: string;
  notes?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  conversations?: TalkRecord[];
  _count?: { conversations: number };
  latestCall?: LatestCallInfo | null;
  calls?: CallHistoryItem[];
}

interface Meta {
  sellers: { id: string; name: string }[];
}

const emptyClientForm = {
  fullName: "", phone: "", country: "", source: "CALL",
  assignedToId: "", talkedAt: "", notes: "",
};

function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-destructive">{msg}</p>;
}

function toLocalDatetime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LeadsPageContent() {
  const { toast } = useToast();
  const { t } = useI18n();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<Meta>({ sellers: [] });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [talkForm, setTalkForm] = useState(emptyTalkForm);
  const [errors, setErrors] = useState<Errors>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterCar, setFilterCar] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterToday, setFilterToday] = useState(false);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const searchParams = useSearchParams();
  const urlHandled = useRef(false);

  const load = useCallback(async () => {
    const [lRes, mRes] = await Promise.all([fetch("/api/leads"), fetch("/api/meta")]);
    const lData = await lRes.json();
    const mData = await mRes.json();
    setLeads(lData.leads ?? []);
    setMeta({ sellers: mData.sellers ?? [] });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (loading || urlHandled.current) return;
    urlHandled.current = true;
    if (searchParams.get("new") === "1") {
      setEditId(null);
      setClientForm({ ...emptyClientForm, talkedAt: toLocalDatetime(new Date().toISOString()) });
      setTalkForm(emptyTalkForm);
      setErrors({});
      setOpen(true);
    }
    if (searchParams.get("today") === "1") setFilterToday(true);
    if (searchParams.get("unassigned") === "1") setFilterUnassigned(true);
    const source = searchParams.get("source");
    if (source) setFilterSource(source);
    const employee = searchParams.get("employee");
    if (employee) setFilterEmployee(employee);
    const country = searchParams.get("country");
    if (country) setFilterCountry(country);
    const outcome = searchParams.get("outcome");
    if (outcome) setFilterOutcome(outcome);
    const color = searchParams.get("color");
    if (color) setFilterColor(color);
    const car = searchParams.get("car");
    if (car) setFilterCar(car);
    const leadId = searchParams.get("id");
    if (leadId && leads.length > 0) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setProfileLoading(true);
        setProfileOpen(true);
        setActiveLead(lead);
        fetch(`/api/leads/${leadId}`)
          .then((r) => r.json())
          .then((d) => { if (d.lead) setActiveLead(d.lead); })
          .finally(() => setProfileLoading(false));
      }
    }
  }, [loading, searchParams, leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return leads.filter((l) => {
      if (filterSource && l.source !== filterSource) return false;
      if (filterEmployee && l.assignedToId !== filterEmployee) return false;
      if (filterCountry && l.country !== filterCountry) return false;
      if (filterColor && l.carColor !== filterColor) return false;
      if (filterOutcome && l.outcome !== filterOutcome) return false;
      if (filterCar) {
        const carQ = filterCar.toLowerCase();
        const hay = `${l.carMake ?? ""} ${l.carModel ?? ""} ${l.carInterest ?? ""}`.toLowerCase();
        if (!hay.includes(carQ)) return false;
      }
      if (filterUnassigned && l.assignedToId) return false;
      if (filterToday) {
        if (!l.talkedAt || new Date(l.talkedAt) < todayStart) return false;
      }
      if (!q) return true;
      const car = formatCarShort(l).toLowerCase();
      return (
        l.fullName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.country ?? "").toLowerCase().includes(q) ||
        car.includes(q) ||
        (l.carColor ?? "").toLowerCase().includes(q) ||
        (l.discussionNotes ?? "").toLowerCase().includes(q) ||
        (l.clientWants ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, search, filterSource, filterEmployee, filterCountry, filterColor, filterOutcome, filterCar, filterToday, filterUnassigned]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: leads.length };
    for (const s of CHANNEL_SOURCES) {
      counts[s] = leads.filter((l) => l.source === s).length;
    }
    return counts;
  }, [leads]);

  function openCreate() {
    setEditId(null);
    setClientForm({ ...emptyClientForm, talkedAt: toLocalDatetime(new Date().toISOString()) });
    setTalkForm(emptyTalkForm);
    setErrors({});
    setOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditId(lead.id);
    setClientForm({
      fullName: lead.fullName,
      phone: lead.phone,
      country: lead.country ?? "",
      source: lead.source,
      assignedToId: lead.assignedToId ?? "",
      talkedAt: toLocalDatetime(lead.talkedAt),
      notes: lead.notes ?? "",
    });
    setTalkForm(talkFormFromRecord(lead));
    setErrors({});
    setOpen(true);
  }

  async function openProfile(lead: Lead) {
    setProfileLoading(true);
    setProfileOpen(true);
    setActiveLead(lead);
    const res = await fetch(`/api/leads/${lead.id}`);
    const data = await res.json();
    if (res.ok) setActiveLead(data.lead);
    setProfileLoading(false);
  }

  function openTalk(lead: Lead) {
    setActiveLead(lead);
    setClientForm({
      ...emptyClientForm,
      country: lead.country ?? "",
      talkedAt: toLocalDatetime(new Date().toISOString()),
    });
    setTalkForm({ ...emptyTalkForm, ...talkFormFromRecord(lead), discussionNotes: "", outcome: "" });
    setTalkOpen(true);
  }

  async function save() {
    const fieldErrors = validateLead({ fullName: clientForm.fullName, phone: clientForm.phone });
    if (hasErrors(fieldErrors)) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    const payload = {
      ...clientForm,
      ...talkForm,
      country: clientForm.country || null,
      assignedToId: clientForm.assignedToId || null,
      talkedAt: clientForm.talkedAt || null,
      notes: clientForm.notes || null,
    };
    const res = await fetch(editId ? `/api/leads/${editId}` : "/api/leads", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      if (data.fields) setErrors(data.fields);
      else toast(t("common.error"), "error");
      return;
    }
    toast(editId ? t("common.updated") : t("common.saved"));
    setOpen(false);
    load();
  }

  async function saveTalk() {
    if (!activeLead) return;
    setSaving(true);
    const res = await fetch(`/api/leads/${activeLead.id}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        talkedAt: clientForm.talkedAt,
        country: clientForm.country,
        ...talkForm,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast(t("common.error"), "error");
      return;
    }
    toast(t("leads.talkSaved"));
    setTalkOpen(false);
    load();
  }

  async function remove() {
    if (!deleteId) return;
    await fetch(`/api/leads/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    toast(t("common.deleted"));
    load();
  }

  function outcomeLabel(key?: string | null) {
    if (!key) return "—";
    return t(`enum.leadOutcome.${key}`) || key;
  }

  function truncate(text?: string | null, len = 36) {
    if (!text) return "—";
    return text.length > len ? `${text.slice(0, len)}…` : text;
  }

  return (
    <div>
      <PageHeader
        title={t("leads.title")}
        description={t("leads.subtitle")}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t("leads.add")}
          </Button>
        }
      />

      <PublicLinksCard />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterSource("")}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-semibold transition-all",
            filterSource === ""
              ? "border-foreground bg-foreground text-background shadow-sm"
              : "border-border text-muted-foreground hover:bg-secondary"
          )}
        >
          {t("leads.allChannels")} ({sourceCounts.ALL})
        </button>
        {CHANNEL_SOURCES.map((s) => {
          const colors = CHANNEL_COLOR[s];
          const active = filterSource === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSource(s)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                active ? colors.tabActive : colors.tab
              )}
            >
              {LEAD_SOURCE[s]} ({sourceCounts[s] ?? 0})
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-blue-800">
          <span className="inline-block h-4 w-2 rounded-full bg-blue-700" /> Qo&apos;ng&apos;iroq
        </span>
        <span className="flex items-center gap-1.5 text-green-800">
          <span className="inline-block h-4 w-2 rounded-full bg-green-600" /> WhatsApp
        </span>
        <span className="flex items-center gap-1.5 text-sky-800">
          <span className="inline-block h-4 w-2 rounded-full bg-[#229ED9]" /> Telegram
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("leads.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="xl:w-40">
          <option value="">{t("leads.filterEmployee")}</option>
          {meta.sellers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="xl:w-40">
          <option value="">{t("leads.filterCountry")}</option>
          {COUNTRY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={filterColor} onChange={(e) => setFilterColor(e.target.value)} className="xl:w-36">
          <option value="">{t("leads.filterColor")}</option>
          {CAR_COLOR_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)} className="xl:w-40">
          <option value="">{t("leads.filterOutcome")}</option>
          {LEAD_OUTCOMES.map((o) => (
            <option key={o} value={o}>{outcomeLabel(o)}</option>
          ))}
        </Select>
        <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="xl:w-40">
          <option value="">{t("leads.filterSource")}</option>
          {Object.entries(LEAD_SOURCE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <Table>
            <THead>
              <TR>
                <TH>{t("leads.col.employee")}</TH>
                <TH>{t("leads.col.source")}</TH>
                <TH>{t("calls.colDirection")}</TH>
                <TH>{t("leads.col.client")}</TH>
                <TH>{t("col.phone")}</TH>
                <TH>{t("leads.col.country")}</TH>
                <TH>{t("leads.col.talkedAt")}</TH>
                <TH>{t("leads.col.carInterest")}</TH>
                <TH>{t("leads.col.carColor")}</TH>
                <TH>{t("calls.colTransmission")}</TH>
                <TH>{t("leads.col.budget")}</TH>
                <TH>{t("leads.col.discussion")}</TH>
                <TH>{t("leads.col.outcome")}</TH>
                <TH>{t("calls.colAudio")}</TH>
                <TH className="text-right">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <TR>
                  <TD colSpan={15} className="py-12 text-center text-muted-foreground">
                    {t("leads.empty")}
                  </TD>
                </TR>
              ) : (
                filtered.map((lead) => {
                  const ch = CHANNEL_COLOR[lead.source];
                  return (
                  <TR
                    key={lead.id}
                    className={cn(
                      "cursor-pointer",
                      ch?.line,
                      ch?.row
                    )}
                    onClick={() => openProfile(lead)}
                  >
                    <TD className="font-medium">{lead.assignedTo?.name ?? "—"}</TD>
                    <TD>
                      <Badge className={cn("font-medium", ch?.badge ?? "bg-secondary text-secondary-foreground")}>
                        {LEAD_SOURCE[lead.source] ?? lead.source}
                      </Badge>
                    </TD>
                    <TD>
                      <DirectionBadge direction={lead.latestCall?.direction} />
                    </TD>
                    <TD>{lead.fullName}</TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5" />
                        {lead.phone}
                      </a>
                    </TD>
                    <TD>
                      <CountryBadge country={lead.country} phone={lead.phone} />
                    </TD>
                    <TD className="whitespace-nowrap text-sm">{formatDateTime(lead.talkedAt)}</TD>
                    <TD className="max-w-[140px] text-sm">{truncate(formatCarShort(lead), 28)}</TD>
                    <TD>
                      <CarColorBadge color={lead.carColor} />
                    </TD>
                    <TD className="text-sm">
                      {transmissionLabel(lead.latestCall?.carTransmission, t)}
                    </TD>
                    <TD className="text-sm">{lead.budget ?? "—"}</TD>
                    <TD className="max-w-[140px] text-sm text-muted-foreground">{truncate(lead.discussionNotes)}</TD>
                    <TD>
                      {lead.outcome ? (
                        <Badge className={cn("font-normal", LEAD_OUTCOME_COLOR[lead.outcome])}>
                          {outcomeLabel(lead.outcome)}
                        </Badge>
                      ) : "—"}
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <ListenAudioLink call={lead.latestCall} />
                    </TD>
                    <TD onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openTalk(lead)} title={t("leads.addTalk")}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openProfile(lead)} title={t("leads.profile")}>
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lead)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(lead.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      )}

      {/* Create / Edit */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editId ? t("leads.edit") : t("leads.add")}
        className="max-w-3xl"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("leads.section.client")}
        </p>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("leads.col.client")}</Label>
            <Input value={clientForm.fullName} onChange={(e) => setClientForm({ ...clientForm, fullName: e.target.value })} />
            <ErrText msg={errors.fullName} />
          </div>
          <div>
            <Label>{t("col.phone")}</Label>
            <PhoneInput
              value={clientForm.phone}
              onChange={(phone) => {
                const detected = detectCountryFromPhone(phone);
                setClientForm({
                  ...clientForm,
                  phone,
                  country: detected || clientForm.country,
                });
                if (errors.phone) setErrors({ ...errors, phone: "" });
              }}
              placeholder="+998 90… / +971 50…"
              className={errors.phone ? "border-destructive" : undefined}
            />
            <ErrText msg={errors.phone} />
          </div>
          <div>
            <Label>{t("leads.col.country")}</Label>
            <div className="flex items-center gap-2">
              <Select
                value={clientForm.country}
                onChange={(e) => setClientForm({ ...clientForm, country: e.target.value })}
                className="flex-1"
              >
                <option value="">{t("common.select")}</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <CountryBadge country={clientForm.country} phone={clientForm.phone} />
            </div>
          </div>
          <div>
            <Label>{t("leads.col.employee")}</Label>
            <Select value={clientForm.assignedToId} onChange={(e) => setClientForm({ ...clientForm, assignedToId: e.target.value })}>
              <option value="">{t("common.select")}</option>
              {meta.sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("leads.col.talkedAt")}</Label>
            <Input type="datetime-local" value={clientForm.talkedAt} onChange={(e) => setClientForm({ ...clientForm, talkedAt: e.target.value })} />
          </div>
          <div>
            <Label>{t("leads.source")}</Label>
            <Select value={clientForm.source} onChange={(e) => setClientForm({ ...clientForm, source: e.target.value })}>
              {Object.entries(LEAD_SOURCE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("common.notes")}</Label>
            <Textarea rows={2} value={clientForm.notes} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} />
          </div>
        </div>

        <TalkFields value={talkForm} onChange={setTalkForm} />

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={save} disabled={saving}>{saving ? t("common.saving") : t("common.save")}</Button>
        </div>
      </Modal>

      {/* Add talk */}
      <Modal open={talkOpen} onClose={() => setTalkOpen(false)} title={t("leads.addTalk")} className="max-w-3xl">
        {activeLead && (
          <div className="mb-4 rounded-xl bg-muted/30 p-3 text-sm">
            <span className="font-semibold">{activeLead.fullName}</span>
            <span className="text-muted-foreground"> · {activeLead.phone}</span>
            <span className="ml-2 inline-flex align-middle">
              <CountryBadge country={activeLead.country} phone={activeLead.phone} />
            </span>
          </div>
        )}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("leads.col.talkedAt")}</Label>
            <Input type="datetime-local" value={clientForm.talkedAt} onChange={(e) => setClientForm({ ...clientForm, talkedAt: e.target.value })} />
          </div>
          <div>
            <Label>{t("leads.col.country")}</Label>
            <Select value={clientForm.country} onChange={(e) => setClientForm({ ...clientForm, country: e.target.value })}>
              <option value="">{t("common.select")}</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </div>
        <TalkFields value={talkForm} onChange={setTalkForm} />
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setTalkOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={saveTalk} disabled={saving}>{saving ? t("common.saving") : t("common.save")}</Button>
        </div>
      </Modal>

      {/* Profile + full history */}
      <Modal open={profileOpen} onClose={() => setProfileOpen(false)} title={t("leads.profile")} className="max-w-3xl">
        {profileLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : activeLead ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{activeLead.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeLead.phone}
                    {activeLead.assignedTo?.name && ` · ${activeLead.assignedTo.name}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CountryBadge country={activeLead.country} phone={activeLead.phone} />
                    <DirectionBadge direction={activeLead.latestCall?.direction} />
                    {activeLead.latestCall?.carTransmission && (
                      <Badge className="bg-secondary text-secondary-foreground font-normal">
                        {transmissionLabel(activeLead.latestCall.carTransmission, t)}
                      </Badge>
                    )}
                    {activeLead.outcome && (
                      <Badge className={cn("font-normal", LEAD_OUTCOME_COLOR[activeLead.outcome])}>
                        {outcomeLabel(activeLead.outcome)}
                      </Badge>
                    )}
                    {(activeLead._count?.conversations ?? activeLead.conversations?.length ?? 0) > 0 && (
                      <Badge className="bg-secondary text-secondary-foreground font-normal">
                        {t("leads.talkCount", {
                          count: activeLead._count?.conversations ?? activeLead.conversations?.length ?? 0,
                        })}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3">
                    <ListenAudioLink call={activeLead.latestCall} />
                  </div>
                </div>
                <Button size="sm" onClick={() => { setProfileOpen(false); openTalk(activeLead); }}>
                  <MessageSquare className="h-4 w-4" /> {t("leads.addTalk")}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">{t("leads.latestTalk")}</h4>
              <TalkRecordCard record={activeLead} />
            </div>

            <CallTranscriptBlock call={activeLead.latestCall} />

            <div>
              <h4 className="mb-3 text-sm font-semibold">{t("leads.callHistory")}</h4>
              {(activeLead.calls?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">{t("leads.noCallHistory")}</p>
              ) : (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {activeLead.calls?.map((c) => (
                    <CallHistoryCard key={c.id} call={c} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">{t("leads.history")}</h4>
              {(activeLead.conversations?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">{t("leads.noHistory")}</p>
              ) : (
                <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                  {activeLead.conversations?.map((c) => (
                    <TalkRecordCard key={c.id} record={c} compact />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={remove}
        title={t("leads.deleteTitle")}
        description={t("leads.deleteDesc")}
      />
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <LeadsPageContent />
    </Suspense>
  );
}
