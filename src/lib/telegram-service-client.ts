export interface TgSessionPublic {
  employeeId: string;
  employeeName: string;
  status: string;
  me: string | null;
  phone: string | null;
  connectedAt: string | null;
  lastError: string | null;
}

function tgBaseUrl(): string {
  const url = (process.env.TELEGRAM_SERVICE_URL || "").trim().replace(/\/$/, "");
  if (!url) throw new Error("TELEGRAM_SERVICE_URL sozlanmagan");
  return url;
}

function tgApiKey(): string {
  return (
    process.env.TELEGRAM_SERVICE_API_KEY?.trim() ||
    process.env.CRM_API_KEY?.trim() ||
    ""
  );
}

async function tgFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = tgApiKey();
  if (!key) throw new Error("TELEGRAM_SERVICE_API_KEY / CRM_API_KEY sozlanmagan");
  const headers = new Headers(init?.headers);
  headers.set("X-API-Key", key);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${tgBaseUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

export async function listTgSessions(): Promise<TgSessionPublic[]> {
  const res = await tgFetch("/sessions");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `TG ${res.status}`);
  return data.sessions ?? [];
}

export async function startTgSession(employeeId: string, employeeName: string) {
  const res = await tgFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({ employeeId, employeeName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `TG ${res.status}`);
  return data.session as TgSessionPublic;
}

export async function stopTgSession(employeeId: string, clearAuth = true) {
  const q = clearAuth ? "?clear=true" : "?clear=false";
  const res = await tgFetch(`/sessions/${encodeURIComponent(employeeId)}${q}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `TG ${res.status}`);
  return data;
}

export async function getTgSession(employeeId: string): Promise<TgSessionPublic | null> {
  const res = await tgFetch(`/sessions/${encodeURIComponent(employeeId)}`);
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `TG ${res.status}`);
  return data.session as TgSessionPublic;
}

export async function submitTgPhone(employeeId: string, phone: string) {
  const res = await tgFetch(`/sessions/${encodeURIComponent(employeeId)}/phone`, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `TG ${res.status}`);
  return data.session as TgSessionPublic;
}

export async function submitTgCode(employeeId: string, code: string) {
  const res = await tgFetch(`/sessions/${encodeURIComponent(employeeId)}/code`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `TG ${res.status}`);
  return data.session as TgSessionPublic;
}

export async function submitTgPassword(employeeId: string, password: string) {
  const res = await tgFetch(`/sessions/${encodeURIComponent(employeeId)}/password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `TG ${res.status}`);
  return data.session as TgSessionPublic;
}

export function isTelegramConfigured(): boolean {
  try {
    return Boolean(tgBaseUrl() && tgApiKey());
  } catch {
    return false;
  }
}
