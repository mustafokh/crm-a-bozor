import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "./config.js";

export interface SessionRecord {
  employeeId: string;
  employeeName: string;
  createdAt: string;
  updatedAt: string;
}

interface StoreFile {
  sessions: SessionRecord[];
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(config.sessionsFile, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (!parsed || !Array.isArray(parsed.sessions)) return { sessions: [] };
    return parsed;
  } catch {
    return { sessions: [] };
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  await fs.mkdir(path.dirname(config.sessionsFile), { recursive: true });
  await fs.writeFile(config.sessionsFile, JSON.stringify(store, null, 2), "utf8");
}

export async function listSessionRecords(): Promise<SessionRecord[]> {
  return (await readStore()).sessions;
}

export async function upsertSessionRecord(
  employeeId: string,
  employeeName: string
): Promise<SessionRecord> {
  const store = await readStore();
  const now = new Date().toISOString();
  const idx = store.sessions.findIndex((s) => s.employeeId === employeeId);
  const record: SessionRecord = {
    employeeId,
    employeeName,
    createdAt: idx >= 0 ? store.sessions[idx]!.createdAt : now,
    updatedAt: now,
  };
  if (idx >= 0) store.sessions[idx] = record;
  else store.sessions.push(record);
  await writeStore(store);
  return record;
}

export async function removeSessionRecord(employeeId: string): Promise<void> {
  const store = await readStore();
  store.sessions = store.sessions.filter((s) => s.employeeId !== employeeId);
  await writeStore(store);
}

/** Eski single-session layout: AUTH_DIR/creds.json (employee papkasiz) */
async function hasFlatLegacyAuth(): Promise<boolean> {
  try {
    await fs.access(path.join(config.authDir, "creds.json"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Multi-session deploydan oldingi flat auth'ni employee papkasiga ko'chiradi.
 * LEGACY_SESSION_EMPLOYEE_ID / LEGACY_SESSION_EMPLOYEE_NAME orqali belgilanadi.
 */
export async function migrateLegacyFlatAuth(): Promise<SessionRecord | null> {
  if (!(await hasFlatLegacyAuth())) return null;

  const employeeId = (
    process.env.LEGACY_SESSION_EMPLOYEE_ID?.trim() ||
    process.env.DEFAULT_SESSION_EMPLOYEE_ID?.trim() ||
    "legacy"
  ).replace(/[^a-zA-Z0-9_-]/g, "_");
  const employeeName =
    process.env.LEGACY_SESSION_EMPLOYEE_NAME?.trim() ||
    process.env.DEFAULT_SESSION_EMPLOYEE_NAME?.trim() ||
    "WhatsApp";

  const targetDir = path.join(config.authDir, employeeId);
  await fs.mkdir(targetDir, { recursive: true });

  const entries = await fs.readdir(config.authDir, { withFileTypes: true });
  let moved = 0;
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const from = path.join(config.authDir, ent.name);
    const to = path.join(targetDir, ent.name);
    try {
      await fs.rename(from, to);
      moved += 1;
    } catch (e) {
      console.error(`[boot] legacy auth move failed ${ent.name}:`, e);
    }
  }

  console.log(
    `[boot] legacy flat auth → ${targetDir} (${moved} fayl), emp=${employeeName}`
  );
  return upsertSessionRecord(employeeId, employeeName);
}

/** AUTH_DIR ichidagi employee papkalarini (creds.json bor) sessions.json ga qo'shadi */
export async function discoverAuthSessions(
  existing: SessionRecord[]
): Promise<SessionRecord[]> {
  const known = new Set(existing.map((s) => s.employeeId));
  let entries: import("node:fs").Dirent[] = [];
  try {
    entries = await fs.readdir(config.authDir, { withFileTypes: true });
  } catch {
    return existing;
  }

  const out = [...existing];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const id = ent.name;
    if (known.has(id)) continue;
    try {
      await fs.access(path.join(config.authDir, id, "creds.json"));
    } catch {
      continue;
    }
    const name = id === "legacy" ? "WhatsApp" : id;
    console.log(`[boot] auth papka topildi, session qo'shiladi: ${id}`);
    out.push(await upsertSessionRecord(id, name));
    known.add(id);
  }
  return out;
}
