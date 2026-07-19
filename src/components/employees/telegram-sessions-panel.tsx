"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Link2Off, RefreshCw, Send } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
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

interface TgSession {
  employeeId: string;
  employeeName: string;
  status: string;
  me: string | null;
  phone: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

type AuthStep = "phone" | "code" | "password";

function statusBadge(status: string, t: (k: string) => string) {
  const map: Record<string, string> = {
    open: "bg-emerald-500/15 text-emerald-700",
    phone_needed: "bg-amber-500/15 text-amber-700",
    code_needed: "bg-amber-500/15 text-amber-700",
    password_needed: "bg-orange-500/15 text-orange-700",
    connecting: "bg-sky-500/15 text-sky-700",
    starting: "bg-sky-500/15 text-sky-700",
    close: "bg-red-500/15 text-red-700",
    stopped: "bg-muted text-muted-foreground",
  };
  const labelKey: Record<string, string> = {
    open: "tg.statusOpen",
    phone_needed: "tg.statusPhone",
    code_needed: "tg.statusCode",
    password_needed: "tg.statusPassword",
    connecting: "tg.statusConnecting",
    starting: "tg.statusStarting",
    close: "tg.statusClose",
    stopped: "tg.statusStopped",
  };
  return (
    <Badge className={cn("font-normal", map[status] ?? "bg-secondary text-secondary-foreground")}>
      {t(labelKey[status] ?? "tg.statusUnknown")} ({status})
    </Badge>
  );
}

function authStepFromStatus(status: string): AuthStep {
  if (status === "code_needed") return "code";
  if (status === "password_needed") return "password";
  return "phone";
}

export function TelegramSessionsPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sessions, setSessions] = useState<TgSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<UserRow | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/sessions");
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
    if (!authUser) return;
    const s = sessions.find((x) => x.employeeId === authUser.id);
    if (s) setAuthStep(authStepFromStatus(s.status));
    if (s?.status === "open") setAuthUser(null);
  }, [sessions, authUser]);

  const sessionByUser = (userId: string) =>
    sessions.find((s) => s.employeeId === userId);

  async function connect(user: UserRow) {
    setBusyId(user.id);
    try {
      const res = await fetch("/api/telegram/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: user.id, employeeName: user.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("tg.connectError"));
      toast(t("tg.connectStarted"), "success");
      await load();
      setAuthUser(user);
      setAuthStep("phone");
      setPhoneInput(user.phone?.trim() || "");
      setCodeInput("");
      setPasswordInput("");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("tg.connectError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function disconnect(user: UserRow) {
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/telegram/sessions/${encodeURIComponent(user.id)}?clear=true`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("tg.disconnectError"));
      toast(t("tg.disconnected"), "success");
      if (authUser?.id === user.id) setAuthUser(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("tg.disconnectError"), "error");
    } finally {
      setBusyId(null);
    }
  }

  function openAuth(user: UserRow) {
    const s = sessionByUser(user.id);
    setAuthUser(user);
    setAuthStep(s ? authStepFromStatus(s.status) : "phone");
    setPhoneInput(s?.phone?.trim() || user.phone?.trim() || "");
    setCodeInput("");
    setPasswordInput("");
  }

  async function submitAuth() {
    if (!authUser) return;
    setAuthBusy(true);
    try {
      let path = "";
      let body: Record<string, string> = {};
      if (authStep === "phone") {
        path = "phone";
        body = { phone: phoneInput.trim() };
      } else if (authStep === "code") {
        path = "code";
        body = { code: codeInput.trim() };
      } else {
        path = "password";
        body = { password: passwordInput };
      }

      const res = await fetch(
        `/api/telegram/sessions/${encodeURIComponent(authUser.id)}/${path}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("tg.authError"));

      const session = data.session as TgSession | undefined;
      if (session?.status === "open") {
        toast(t("tg.linkedSuccess"), "success");
        setAuthUser(null);
      } else if (session) {
        setAuthStep(authStepFromStatus(session.status));
        if (session.status === "code_needed") toast(t("tg.codeSent"), "success");
        if (session.status === "password_needed") toast(t("tg.passwordNeeded"), "info");
      }
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("tg.authError"), "error");
    } finally {
      setAuthBusy(false);
    }
  }

  const authSession = authUser ? sessionByUser(authUser.id) : null;

  return (
    <>
      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-sky-600" />
            {t("tg.title")}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {t("common.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t("tg.subtitle")}</p>

          {!configured && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
              {t("tg.notConfigured")}
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
                <TH>{t("tg.colStatus")}</TH>
                <TH>{t("tg.colAccount")}</TH>
                <TH className="text-right">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {users.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t("tg.noEmployees")}
                  </TD>
                </TR>
              ) : (
                users.map((u) => {
                  const s = sessionByUser(u.id);
                  const busy = busyId === u.id;
                  const needsAuth =
                    s &&
                    s.status !== "open" &&
                    s.status !== "stopped" &&
                    s.status !== "close";
                  return (
                    <TR key={u.id}>
                      <TD>
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TD>
                      <TD>
                        {s ? (
                          statusBadge(s.status, t)
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("tg.notLinked")}</span>
                        )}
                      </TD>
                      <TD className="text-sm">{s?.me ?? "—"}</TD>
                      <TD>
                        <div className="flex justify-end gap-1">
                          {needsAuth && (
                            <Button variant="ghost" size="sm" onClick={() => openAuth(u)}>
                              {t("tg.continueAuth")}
                            </Button>
                          )}
                          {!s || s.status === "stopped" || s.status === "close" ? (
                            <Button
                              size="sm"
                              disabled={!configured || busy}
                              onClick={() => connect(u)}
                            >
                              <Link2 className="h-4 w-4" />
                              {t("tg.connect")}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => disconnect(u)}
                            >
                              <Link2Off className="h-4 w-4" />
                              {t("tg.disconnect")}
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
        open={!!authUser}
        onClose={() => setAuthUser(null)}
        title={authUser ? `${t("tg.authTitle")} — ${authUser.name}` : t("tg.authTitle")}
        className="max-w-md"
      >
        {authUser && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("tg.authHint")}</p>

            {authSession && authSession.status !== "open" && (
              <div>{statusBadge(authSession.status, t)}</div>
            )}

            {authSession?.status === "open" ? (
              <p className="text-sm font-medium text-emerald-600">
                {t("tg.linkedAs")} {authSession.me}
              </p>
            ) : (
              <>
                {authStep === "phone" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("tg.phoneLabel")}</label>
                    <Input
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+998901234567"
                      autoComplete="tel"
                    />
                  </div>
                )}

                {authStep === "code" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("tg.codeLabel")}</label>
                    <Input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder="12345"
                      autoComplete="one-time-code"
                    />
                    <p className="text-xs text-muted-foreground">{t("tg.codeHint")}</p>
                  </div>
                )}

                {authStep === "password" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("tg.passwordLabel")}</label>
                    <Input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••"
                      autoComplete="current-password"
                    />
                    <p className="text-xs text-muted-foreground">{t("tg.passwordHint")}</p>
                  </div>
                )}

                <Button className="w-full" disabled={authBusy} onClick={submitAuth}>
                  {authStep === "phone"
                    ? t("tg.sendCode")
                    : authStep === "code"
                      ? t("tg.verifyCode")
                      : t("tg.verifyPassword")}
                </Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
