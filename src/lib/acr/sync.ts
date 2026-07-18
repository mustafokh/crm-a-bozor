/**
 * Cube ACR → Google Drive → Whisper (en) → CRM /api/calls
 * Runs inside CRM (Always On). No laptop / no extra App Service.
 */

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

type DriveFile = { id: string; name: string };

function cfg() {
  return {
    enabled: (process.env.ACR_SYNC_ENABLED || "").toLowerCase() === "true",
    intervalMs: Math.max(60_000, Number(process.env.ACR_CHECK_INTERVAL_MS || 300_000)),
    folderName: process.env.DRIVE_FOLDER_NAME || "Cube ACR",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
    openaiKey: process.env.OPENAI_API_KEY || "",
    whisperLanguage: process.env.WHISPER_LANGUAGE || "en",
    crmApiKey: process.env.CRM_API_KEY || "",
    appUrl: (process.env.APP_URL || "https://mkus-crm-fed7cd.azurewebsites.net").replace(/\/$/, ""),
    processedFile: process.env.ACR_PROCESSED_FILE || "/home/acr-processed.json",
  };
}

function ready(c: ReturnType<typeof cfg>): string | null {
  if (!c.enabled) return "ACR_SYNC_ENABLED!=true";
  if (!c.clientId || !c.clientSecret || !c.refreshToken) return "missing Google OAuth env";
  if (!c.openaiKey) return "missing OPENAI_API_KEY";
  if (!c.crmApiKey) return "missing CRM_API_KEY";
  return null;
}

async function loadProcessed(path: string): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(path, "utf8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return new Set(data.map(String));
  } catch {
    /* first run */
  }
  return new Set();
}

async function saveProcessed(path: string, ids: Set<string>) {
  await fs.mkdir(dirname(path), { recursive: true }).catch(() => undefined);
  await fs.writeFile(path, JSON.stringify([...ids]), "utf8");
}

async function googleAccessToken(c: ReturnType<typeof cfg>): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: c.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`Google token: ${body.error || res.status}`);
  }
  return body.access_token;
}

async function driveGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function findFolderId(token: string, name: string): Promise<string> {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const data = await driveGet<{ files: DriveFile[] }>(
    token,
    `files?q=${q}&fields=files(id,name)&pageSize=5`
  );
  if (!data.files?.length) throw new Error(`Drive folder not found: ${name}`);
  return data.files[0].id;
}

async function listFolder(token: string, folderId: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const data = await driveGet<{ files: DriveFile[] }>(
    token,
    `files?q=${q}&fields=files(id,name)&pageSize=1000`
  );
  return data.files || [];
}

async function downloadFile(token: string, fileId: string): Promise<Buffer> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Download ${fileId}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ensureFfmpeg(): Promise<string> {
  const dest = process.env.FFMPEG_PATH || "/home/ffmpeg";
  try {
    await fs.access(dest);
    return dest;
  } catch {
    /* download once */
  }
  // Static amd64 build (Azure App Service Linux)
  const url =
    process.env.FFMPEG_STATIC_URL ||
    "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/ffmpeg-linux-x64";
  console.log("[acr-sync] downloading ffmpeg...");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ffmpeg download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf, { mode: 0o755 });
  return dest;
}

async function amrToMp3(amr: Buffer): Promise<Buffer> {
  const ffmpegPath = await ensureFfmpeg();
  const amrPath = join(tmpdir(), `acr-${Date.now()}.amr`);
  const mp3Path = amrPath.replace(/\.amr$/i, ".mp3");
  await fs.writeFile(amrPath, amr);
  try {
    await execFileAsync(
      ffmpegPath,
      ["-y", "-i", amrPath, "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", mp3Path],
      { timeout: 120_000 }
    );
    return await fs.readFile(mp3Path);
  } finally {
    await fs.unlink(amrPath).catch(() => undefined);
    await fs.unlink(mp3Path).catch(() => undefined);
  }
}

async function whisper(c: ReturnType<typeof cfg>, mp3: Buffer, fileName: string): Promise<string> {
  const form = new FormData();
  const bytes = new Uint8Array(mp3);
  form.append(
    "file",
    new Blob([bytes], { type: "audio/mpeg" }),
    fileName.replace(/\.amr$/i, ".mp3")
  );
  form.append("model", "whisper-1");
  form.append("language", c.whisperLanguage);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.openaiKey}` },
    body: form,
  });
  const body = (await res.json()) as { text?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(`Whisper: ${body.error?.message || res.status}`);
  const text = (body.text || "").trim();
  if (!text) throw new Error("Empty Whisper transcript");
  return text;
}

function firstStr(meta: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = meta[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function extractPhone(meta: Record<string, unknown>, fileName: string): string {
  const phone = firstStr(meta, "phone_number", "phone", "number", "phoneNumber", "tel", "caller");
  if (phone) return phone;
  const m = fileName.match(/(\+?\d[\d\s\-()]{7,}\d)/);
  if (m) return m[1].replace(/[\s\-()]/g, "");
  throw new Error(`No phone in meta/name: ${fileName}`);
}

function extractCallDate(meta: Record<string, unknown>): string {
  const raw = firstStr(meta, "call_date", "date", "datetime", "timestamp", "time", "created");
  if (!raw) return new Date().toISOString();
  if (/^\d{10,13}$/.test(raw)) {
    let ts = Number(raw);
    if (ts > 10_000_000_000) ts = Math.floor(ts / 1000);
    return new Date(ts * 1000).toISOString();
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw : d.toISOString();
}

async function postToCrm(c: ReturnType<typeof cfg>, payload: Record<string, unknown>) {
  const res = await fetch(`${c.appUrl}/api/calls`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": c.crmApiKey,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`CRM ${res.status}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}

export async function runAcrSyncOnce(): Promise<{
  ok: boolean;
  processed: number;
  skipped: string | null;
  error?: string;
}> {
  const c = cfg();
  const skip = ready(c);
  if (skip) return { ok: true, processed: 0, skipped: skip };

  try {
    const token = await googleAccessToken(c);
    const folderId = await findFolderId(token, c.folderName);
    const files = await listFolder(token, folderId);
    const amrs = files.filter((f) => f.name.toLowerCase().endsWith(".amr"));
    const jsons = new Map(
      files.filter((f) => f.name.toLowerCase().endsWith(".json")).map((f) => [f.name, f])
    );
    const processed = await loadProcessed(c.processedFile);
    let count = 0;

    for (const amr of amrs) {
      if (processed.has(amr.id)) continue;
      console.log(`[acr-sync] processing ${amr.name}`);
      try {
        const amrBuf = await downloadFile(token, amr.id);
        let meta: Record<string, unknown> = {};
        const jsonName = amr.name.replace(/\.amr$/i, ".json");
        const jsonFile = jsons.get(jsonName);
        if (jsonFile) {
          const raw = await downloadFile(token, jsonFile.id);
          try {
            meta = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
          } catch {
            meta = {};
          }
        }
        const mp3 = await amrToMp3(amrBuf);
        const transcript = await whisper(c, mp3, amr.name);
        const phone = extractPhone(meta, amr.name);
        const callDate = extractCallDate(meta);
        await postToCrm(c, {
          phone,
          transcript,
          raw_transcript: transcript,
          call_date: callDate,
          file_name: amr.name,
          source: "call",
        });
        processed.add(amr.id);
        await saveProcessed(c.processedFile, processed);
        count += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[acr-sync] failed ${amr.name}:`, msg);
      }
    }
    return { ok: true, processed: count, skipped: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[acr-sync] poll error:", msg);
    return { ok: false, processed: 0, skipped: null, error: msg };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __acrPollerStarted: boolean | undefined;
}

export function startAcrPoller() {
  if (globalThis.__acrPollerStarted) return;
  const c = cfg();
  const skip = ready(c);
  if (skip) {
    console.log(`[acr-sync] not started: ${skip}`);
    return;
  }
  globalThis.__acrPollerStarted = true;
  console.log(`[acr-sync] started, interval=${c.intervalMs}ms folder=${c.folderName}`);
  const tick = () => {
    void runAcrSyncOnce();
  };
  setTimeout(tick, 15_000);
  setInterval(tick, c.intervalMs);
}
