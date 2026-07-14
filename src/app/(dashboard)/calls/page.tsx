"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Phone, Search, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/components/language-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import {
  CALL_OUTCOME,
  CALL_OUTCOMES,
  CALL_OUTCOME_COLOR,
  CALL_LEAD_SOURCE,
  CALL_SOURCE_TYPE,
  CALL_SENTIMENT_COLOR,
  COUNTRY_OPTIONS,
} from "@/lib/constants";
import { formatDateTime, cn } from "@/lib/utils";

interface CallRecord {
  id: string;
  phone: string;
  country?: string | null;
  callDate: string;
  durationSeconds?: number | null;
  fileName?: string | null;
  source: string;
  rawTranscript: string;
  employeeName?: string | null;
  customerName?: string | null;
  customerIntent?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carBrand?: string | null;
  outcome?: string | null;
  reasonPurchased?: string | null;
  reasonNotPurchased?: string | null;
  leadSource?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  followUpNeeded: boolean;
  followUpNote?: string | null;
  createdAt: string;
}

function formatDuration(sec?: number | null) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallsPage() {
  const { t } = useI18n();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [employees, setEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<CallRecord | null>(null);

  const [search, setSearch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filterEmployee) params.set("employee", filterEmployee);
    if (filterOutcome) params.set("outcome", filterOutcome);
    if (filterCountry) params.set("country", filterCountry);
    if (filterSource) params.set("source", filterSource);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    const res = await fetch(`/api/calls?${params.toString()}`);
    const data = await res.json();
    setCalls(data.calls ?? []);
    setEmployees(data.filters?.employees ?? []);
    setLoading(false);
  }, [search, filterEmployee, filterOutcome, filterCountry, filterSource, dateFrom, dateTo]);

  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const stats = useMemo(() => ({
    total: calls.length,
    followUp: calls.filter((c) => c.followUpNeeded).length,
    purchased: calls.filter((c) => c.outcome === "purchased").length,
  }), [calls]);

  return (
    <div>
      <PageHeader
        title={t("calls.title")}
        description={t("calls.subtitle")}
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("calls.total")}</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("calls.purchased")}</p>
          <p className="mt-1 text-2xl font-bold text-success">{stats.purchased}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">{t("calls.followUp")}</p>
          <p className="mt-1 text-2xl font-bold text-primary">{stats.followUp}</p>
        </Card>
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("calls.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Label className="sr-only">{t("calls.filterEmployee")}</Label>
            <Select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">{t("calls.allEmployees")}</option>
              {employees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Select value={filterOutcome} onChange={(e) => setFilterOutcome(e.target.value)}>
              <option value="">{t("calls.allOutcomes")}</option>
              {CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>{CALL_OUTCOME[o]}</option>
              ))}
            </Select>
          </div>
          <div>
            <Select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
              <option value="">{t("calls.allCountries")}</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="w-44">
            <option value="">{t("calls.allSources")}</option>
            <option value="call">{CALL_SOURCE_TYPE.call}</option>
            <option value="whatsapp">{CALL_SOURCE_TYPE.whatsapp}</option>
            <option value="telegram">{CALL_SOURCE_TYPE.telegram}</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-4"><TableSkeleton /></div>
        ) : calls.length === 0 ? (
          <EmptyState
            icon={Phone}
            title={t("calls.empty")}
            description={t("calls.emptyDesc")}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("calls.colDate")}</TH>
                <TH>{t("calls.colEmployee")}</TH>
                <TH>{t("calls.colCustomer")}</TH>
                <TH>{t("calls.colModel")}</TH>
                <TH>{t("calls.colColor")}</TH>
                <TH>{t("calls.colOutcome")}</TH>
                <TH>{t("calls.colLeadSource")}</TH>
                <TH>{t("calls.colCountry")}</TH>
                <TH>{t("calls.colSource")}</TH>
              </TR>
            </THead>
            <TBody>
              {calls.map((c) => (
                <TR
                  key={c.id}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => setActive(c)}
                >
                  <TD className="whitespace-nowrap text-sm">{formatDateTime(c.callDate)}</TD>
                  <TD>{c.employeeName ?? "—"}</TD>
                  <TD>
                    <div className="font-medium">{c.customerName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.phone}</div>
                  </TD>
                  <TD>
                    {c.carBrand || c.carModel
                      ? `${c.carBrand ?? ""} ${c.carModel ?? ""}`.trim()
                      : "—"}
                  </TD>
                  <TD>{c.carColor ?? "—"}</TD>
                  <TD>
                    {c.outcome ? (
                      <Badge className={cn("text-xs", CALL_OUTCOME_COLOR[c.outcome])}>
                        {CALL_OUTCOME[c.outcome] ?? c.outcome}
                      </Badge>
                    ) : "—"}
                  </TD>
                  <TD>{c.leadSource ? (CALL_LEAD_SOURCE[c.leadSource] ?? c.leadSource) : "—"}</TD>
                  <TD>{c.country ?? "—"}</TD>
                  <TD>
                    <Badge className="border border-border bg-transparent text-xs">
                      {CALL_SOURCE_TYPE[c.source] ?? c.source}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={t("calls.detailTitle")}
        className="max-w-2xl"
      >
        {active && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">{t("calls.colDate")}:</span> {formatDateTime(active.callDate)}</div>
              <div><span className="text-muted-foreground">{t("calls.duration")}:</span> {formatDuration(active.durationSeconds)}</div>
              <div><span className="text-muted-foreground">{t("calls.colEmployee")}:</span> {active.employeeName ?? "—"}</div>
              <div><span className="text-muted-foreground">{t("calls.colCustomer")}:</span> {active.customerName ?? "—"}</div>
              <div><span className="text-muted-foreground">{t("calls.colCountry")}:</span> {active.country ?? "—"}</div>
              <div><span className="text-muted-foreground">{t("calls.colSource")}:</span> {CALL_SOURCE_TYPE[active.source] ?? active.source}</div>
            </div>

            {active.summary && (
              <div>
                <p className="mb-1 font-medium">{t("calls.summary")}</p>
                <p className="rounded-lg bg-secondary/60 p-3">{active.summary}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {active.outcome && (
                <Badge className={CALL_OUTCOME_COLOR[active.outcome]}>
                  {CALL_OUTCOME[active.outcome] ?? active.outcome}
                </Badge>
              )}
              {active.sentiment && (
                <Badge className={CALL_SENTIMENT_COLOR[active.sentiment]}>
                  {active.sentiment}
                </Badge>
              )}
              {active.followUpNeeded && (
                <Badge className="bg-primary/15 text-primary">{t("calls.followUpNeeded")}</Badge>
              )}
            </div>

            {(active.reasonPurchased || active.reasonNotPurchased) && (
              <div className="space-y-2">
                {active.reasonPurchased && (
                  <p><span className="text-muted-foreground">{t("calls.reasonPurchased")}:</span> {active.reasonPurchased}</p>
                )}
                {active.reasonNotPurchased && (
                  <p><span className="text-muted-foreground">{t("calls.reasonNotPurchased")}:</span> {active.reasonNotPurchased}</p>
                )}
              </div>
            )}

            {active.followUpNote && (
              <p><span className="text-muted-foreground">{t("calls.followUpNote")}:</span> {active.followUpNote}</p>
            )}

            <div>
              <p className="mb-1 flex items-center gap-2 font-medium">
                <MessageSquare className="h-4 w-4" />
                {t("calls.rawTranscript")}
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-xs">
                {active.rawTranscript}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
