import express from "express";
import { config } from "./config.js";
import { getQrPng, runtime, startWhatsApp } from "./whatsapp.js";

const app = express();
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    status: runtime.status,
    me: runtime.me,
    connectedAt: runtime.connectedAt,
    lastError: runtime.lastError,
    hasQr: Boolean(runtime.lastQr),
  });
});

app.get("/status", (_req, res) => {
  res.json({ ...runtime, lastQr: runtime.lastQr ? "[hidden — use /qr]" : null });
});

/** QR PNG — WhatsApp → Linked devices bilan skanerlang */
app.get("/qr.png", async (_req, res) => {
  const png = await getQrPng();
  if (!png) {
    res.status(404).json({
      error: "QR yo‘q",
      status: runtime.status,
      hint: runtime.status === "open" ? "Allaqachon ulangan" : "Ulanishni kuting",
    });
    return;
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store");
  res.send(png);
});

/** Oddiy HTML sahifa — mobil/desktop skaner uchun */
app.get("/qr", async (_req, res) => {
  if (runtime.status === "open") {
    res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>WhatsApp</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b1220;color:#e2e8f0}
.card{background:#111827;padding:2rem;border-radius:1rem;text-align:center;max-width:28rem}</style></head>
<body><div class="card"><h1>Ulangan</h1><p>${runtime.me ?? "WhatsApp"}</p>
<p style="opacity:.7">${runtime.connectedAt ?? ""}</p></div></body></html>`);
    return;
  }

  if (!runtime.lastQr) {
    res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>QR</title>
<meta http-equiv="refresh" content="3"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b1220;color:#e2e8f0}</style>
</head><body><p>QR kutilmoqda… status: <b>${runtime.status}</b></p></body></html>`);
    return;
  }

  res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>WhatsApp QR</title>
<meta http-equiv="refresh" content="20"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b1220;color:#e2e8f0}
.card{background:#111827;padding:2rem;border-radius:1rem;text-align:center;max-width:28rem;box-shadow:0 10px 40px rgba(0,0,0,.35)}
img{width:min(320px,80vw);height:auto;background:#fff;padding:12px;border-radius:12px}
p{opacity:.8;line-height:1.5}
</style></head>
<body><div class="card">
<h1>WhatsApp QR</h1>
<p>WhatsApp → Linked devices → Link a device</p>
<img src="/qr.png?t=${Date.now()}" alt="QR"/>
<p>Yangilanadi: ${runtime.lastQrAt ?? ""}</p>
</div></body></html>`);
});

app.get("/", (_req, res) => {
  res.redirect(runtime.status === "open" ? "/status" : "/qr");
});

async function main() {
  console.log("[boot] CRM:", config.crmApiUrl);
  console.log("[boot] AUTH_DIR:", config.authDir);
  console.log("[boot] PORT:", config.port);

  app.listen(config.port, config.host, () => {
    console.log(`[http] http://${config.host}:${config.port}/qr`);
  });

  await startWhatsApp();
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
