"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Link2Off, RefreshCw, QrCode } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
}

interface WaSession {
  employeeId: string;
  employeeName: string;
  status: string;
  me: string | null;
  connectedAt: string | null;
  lastError: string | null;
  hasQr: boolean;
  lastQrAt: string | null;
}

function statusBadge(status: string, t: (k: string) => string) {
  const map: Record<string, string> = {
    open: "bg-emerald-500/15 text-emerald-700",
    qr: "bg-amber-500/15 text-amber-700",
    connecting: "bg-sky-500/15 text-sky-700",
    starting: "bg-sky-500/15 text-sky-700",
    close: "bg-red-500/15 text-red-700",
    stopped: "bg-muted text-muted-foreground",
  };
  const labelKey: Record<string, string> = {
    open: "wa.statusOpen",
    qr: "wa.statusQr",
    connecting: "wa.statusConnecting",
    starting: "wa.statusStarting",
    close: "wa.statusClose",
    stopped: "wa.statusStopped",
  };
  return (
    <Badge className={cn("font-normal", map[status] ?? "bg-secondary text-secondary-foreground")}>
      {t(labelKey[status] ?? "wa.statusUnknown")} ({status})
    </Badge>
  );
}

export function WhatsAppSessionsPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sessions, setSessions] = useState<WaSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrUser, setQrUser] = useState<UserRow | null>(null);
  const [qrTick, setQrTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp/sessions");
      const data = await res.json();
      setConfigured(Boolean(data.configured));
      setUsers(data.users ?? []);
      setSessions(data.sessions ?? []);
      setError(data.error ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!qrUser) return;
    const id = setInterval(() => setQrTick((n) => n + 1), 4000);
    return () => clearInterval(id);
  }, [qrUser]);

  const sessionByUser = (userId: string) =>
    sessions.find((s) => s.employeeId === userId);

  async function connect(user: UserRow) {
    setBusyId(user.id);
    try {
      const res = await fetch("/api/whatsapp/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: user.id, employeeName: user.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("wa.connectError"));
      toast(t("wa.connectStarted"), "success");
      await load();
      setQrUser(user);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("wa.connectError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function disconnect(user: UserRow) {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/whatsapp/sessions/${encodeURIComponent(user.id)}?clear=true`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("wa.disconnectError"));
      toast(t("wa.disconnected"), "success");
      if (qrUser?.id === user.id) setQrUser(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("wa.disconnectError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t("wa.title")}</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t("wa.subtitle")}</p>

          {!configured && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
              {t("wa.notConfigured")}
            </p>
          )}

          {error && configured && (
            <p className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Table>
            <THead>
              <TR>
                <TH>{t("employees.colName")}</TH>
                <TH>{t("wa.colStatus")}</TH>
                <TH>{t("wa.colNumber")}</TH>
                <TH className="text-right">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {users.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t("wa.noEmployees")}
                  </TD>
                </TR>
              ) : (
                users.map((u) => {
                  const s = sessionByUser(u.id);
                  const busy = busyId === u.id;
                  return (
                    <TR key={u.id}>
                      <TD>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TD>
                      <TD>{s ? statusBadge(s.status, t) : (
                        <span className="text-xs text-muted-foreground">{t("wa.notLinked")}</span>
                      )}</TD>
                      <TD className="text-sm">{s?.me ?? "—"}</TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          {s && (s.status === "qr" || s.hasQr || s.status === "open" || s.status === "connecting") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setQrUser(u)}
                              title={t("wa.showQr")}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          )}
                          {!s || s.status === "stopped" || s.status === "close" ? (
                            <Button
                              size="sm"
                              disabled={!configured || busy}
                              onClick={() => connect(u)}
                            >
                              <Link2 className="h-4 w-4" />
                              {t("wa.connect")}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => disconnect(u)}
                            >
                              <Link2Off className="h-4 w-4" />
                              {t("wa.disconnect")}
                            </Button>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Modal
        open={!!qrUser}
        onClose={() => setQrUser(null)}
        title={qrUser ? `${t("wa.qrTitle")} — ${qrUser.name}` : t("wa.qrTitle")}
        className="max-w-md"
      >
        {qrUser && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">{t("wa.qrHint")}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={qrTick}
              src={`/api/whatsapp/sessions/${encodeURIComponent(qrUser.id)}/qr?t=${qrTick}`}
              alt="WhatsApp QR"
              className="mx-auto rounded-xl border border-border bg-white p-3"
              width={280}
              height={280}
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.3";
              }}
            />
            {(() => {
              const s = sessionByUser(qrUser.id);
              if (s?.status === "open") {
                return (
                  <p className="text-sm font-medium text-emerald-600">
                    {t("wa.linkedAs")} {s.me}
                  </p>
                );
              }
              return (
                <p className="text-xs text-muted-foreground">
                  {s ? statusBadge(s.status, t) : t("wa.waitingQr")}
                </p>
              );
            })()}
            <Button variant="outline" size="sm" onClick={() => setQrTick((n) => n + 1)}>
              <RefreshCw className="h-4 w-4" />
              {t("common.refresh")}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
