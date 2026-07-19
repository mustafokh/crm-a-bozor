import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import {
  getSession,
  listSessionsPublic,
  restoreSessions,
  startSession,
  stopSession,
  submitCode,
  submitPassword,
  submitPhone,
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

app.post("/sessions/:employeeId/phone", requireServiceKey, (req, res) => {
  try {
    const employeeId = String(req.params.employeeId);
    const phone = String(req.body?.phone ?? "").trim();
    const session = submitPhone(employeeId, phone);
    res.json({ ok: true, session: session.toPublic() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: message });
  }
});

app.post("/sessions/:employeeId/code", requireServiceKey, (req, res) => {
  try {
    const employeeId = String(req.params.employeeId);
    const code = String(req.body?.code ?? "").trim();
    const session = submitCode(employeeId, code);
    res.json({ ok: true, session: session.toPublic() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: message });
  }
});

app.post("/sessions/:employeeId/password", requireServiceKey, (req, res) => {
  try {
    const employeeId = String(req.params.employeeId);
    const password = String(req.body?.password ?? "").trim();
    const session = submitPassword(employeeId, password);
    res.json({ ok: true, session: session.toPublic() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: message });
  }
});

app.get("/", (_req, res) => {
  res.json({
    service: "mkus-telegram-multi",
    health: "/health",
    sessions: "/sessions",
    auth: "POST /sessions/:id/phone → /code → /password (2FA)",
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
