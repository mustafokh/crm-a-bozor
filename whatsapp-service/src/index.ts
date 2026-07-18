import express, { type Request, type Response, type NextFunction } from "express";
import { config } from "./config.js";
import {
  getSession,
  listSessionsPublic,
  restoreSessions,
  startSession,
  stopSession,
} from "./session-manager.js";

const app = express();
app.use(express.json({ limit: "32kb" }));

function requireServiceKey(req: Request, res: Response, next: NextFunction) {
  const key =
    req.header("X-API-Key") ||
    req.header("x-api-key") ||
    String(req.query.key ?? "").trim() ||
    "";
  if (!config.serviceApiKey || key !== config.serviceApiKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  const list = listSessionsPublic();
  res.json({
    ok: true,
    sessions: list.length,
    open: list.filter((s) => s.status === "open").length,
    maxSessions: config.maxSessions,
  });
});

app.get("/sessions", requireServiceKey, (_req, res) => {
  res.json({ sessions: listSessionsPublic() });
});

app.post("/sessions", requireServiceKey, async (req, res) => {
  try {
    const employeeId = String(req.body?.employeeId ?? "").trim();
    const employeeName = String(req.body?.employeeName ?? "").trim();
    const session = await startSession(employeeId, employeeName);
    res.status(201).json({ ok: true, session: session.toPublic() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: message });
  }
});

app.get("/sessions/:employeeId", requireServiceKey, (req, res) => {
  const employeeId = String(req.params.employeeId);
  const session = getSession(employeeId);
  if (!session) {
    res.status(404).json({ error: "Session topilmadi" });
    return;
  }
  res.json({ session: session.toPublic() });
});

app.delete("/sessions/:employeeId", requireServiceKey, async (req, res) => {
  const employeeId = String(req.params.employeeId);
  const clearAuth = String(req.query.clear ?? "true").toLowerCase() !== "false";
  const ok = await stopSession(employeeId, clearAuth);
  if (!ok) {
    res.status(404).json({ error: "Session topilmadi" });
    return;
  }
  res.json({ ok: true });
});

app.get("/sessions/:employeeId/qr.png", requireServiceKey, async (req, res) => {
  const employeeId = String(req.params.employeeId);
  const session = getSession(employeeId);
  if (!session) {
    res.status(404).json({ error: "Session topilmadi" });
    return;
  }
  const png = await session.getQrPng();
  if (!png) {
    res.status(404).json({
      error: "QR yo‘q",
      status: session.runtime.status,
      hint: session.runtime.status === "open" ? "Allaqachon ulangan" : "Ulanishni kuting",
    });
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store");
  res.send(png);
});

app.get("/sessions/:employeeId/qr", requireServiceKey, async (req, res) => {
  const employeeId = String(req.params.employeeId);
  const session = getSession(employeeId);
  if (!session) {
    res.status(404).type("html").send("<p>Session topilmadi</p>");
    return;
  }
  const rt = session.runtime;
  if (rt.status === "open") {
    res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>${rt.employeeName}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b1220;color:#e2e8f0}
.card{background:#111827;padding:2rem;border-radius:1rem;text-align:center}</style></head>
<body><div class="card"><h1>${rt.employeeName}</h1><p>Ulangan: ${rt.me ?? ""}</p></div></body></html>`);
    return;
  }
  if (!rt.lastQr) {
    res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"/><meta http-equiv="refresh" content="3"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b1220;color:#e2e8f0}</style>
</head><body><p>${rt.employeeName}: QR kutilmoqda… (${rt.status})</p></body></html>`);
    return;
  }
  res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>QR — ${rt.employeeName}</title>
<meta http-equiv="refresh" content="15"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b1220;color:#e2e8f0}
.card{background:#111827;padding:2rem;border-radius:1rem;text-align:center;max-width:28rem}
img{width:min(320px,80vw);background:#fff;padding:12px;border-radius:12px}
</style></head>
<body><div class="card">
<h1>${rt.employeeName}</h1>
<p>WhatsApp → Linked devices → Link a device</p>
<img src="/sessions/${encodeURIComponent(rt.employeeId)}/qr.png?t=${Date.now()}&key=${encodeURIComponent(config.serviceApiKey)}" alt="QR"/>
</div></body></html>`);
});

app.get("/", (_req, res) => {
  res.json({
    service: "mkus-whatsapp-multi",
    health: "/health",
    sessions: "/sessions",
  });
});

async function main() {
  console.log("[boot] CRM:", config.crmApiUrl);
  console.log("[boot] AUTH_DIR:", config.authDir);
  console.log("[boot] SESSIONS_FILE:", config.sessionsFile);
  console.log("[boot] MAX_SESSIONS:", config.maxSessions);
  console.log("[boot] PORT:", config.port);

  app.listen(config.port, config.host, () => {
    console.log(`[http] http://${config.host}:${config.port}`);
  });

  await restoreSessions();
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
