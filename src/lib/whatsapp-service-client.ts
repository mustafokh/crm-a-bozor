export interface WaSessionPublic {
  employeeId: string;
  employeeName: string;
  status: string;
  me: string | null;
  connectedAt: string | null;
  lastError: string | null;
  hasQr: boolean;
  lastQrAt: string | null;
}

function waBaseUrl(): string {
  const url = (process.env.WHATSAPP_SERVICE_URL || "").trim().replace(/\/$/, "");
  if (!url) throw new Error("WHATSAPP_SERVICE_URL sozlanmagan");
  return url;
}

function waApiKey(): string {
  return (
    process.env.WHATSAPP_SERVICE_API_KEY?.trim() ||
    process.env.CRM_API_KEY?.trim() ||
    ""
  );
}

async function waFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = waApiKey();
  if (!key) throw new Error("WHATSAPP_SERVICE_API_KEY / CRM_API_KEY sozlanmagan");
  const headers = new Headers(init?.headers);
  headers.set("X-API-Key", key);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${waBaseUrl()}${path}`, { ...init, headers, cache: "no-store" });
}

export async function listWaSessions(): Promise<WaSessionPublic[]> {
  const res = await waFetch("/sessions");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `WA ${res.status}`);
  return data.sessions ?? [];
}

export async function startWaSession(employeeId: string, employeeName: string) {
  const res = await waFetch("/sessions", {
    method: "POST",
    body: JSON.stringify({ employeeId, employeeName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `WA ${res.status}`);
  return data.session as WaSessionPublic;
}

export async function stopWaSession(employeeId: string, clearAuth = true) {
  const q = clearAuth ? "?clear=true" : "?clear=false";
  const res = await waFetch(`/sessions/${encodeURIComponent(employeeId)}${q}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `WA ${res.status}`);
  return data;
}

export async function getWaSession(employeeId: string): Promise<WaSessionPublic | null> {
  const res = await waFetch(`/sessions/${encodeURIComponent(employeeId)}`);
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `WA ${res.status}`);
  return data.session as WaSessionPublic;
}

export async function getWaQrPng(employeeId: string): Promise<Buffer | null> {
  const res = await waFetch(`/sessions/${encodeURIComponent(employeeId)}/qr.png`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text.slice(0, 200) || `WA ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export function isWhatsAppConfigured(): boolean {
  try {
    return Boolean(waBaseUrl() && waApiKey());
  } catch {
    return false;
  }
}
