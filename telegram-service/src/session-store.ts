import { promises as fs } from "node:fs";
import path from "node:path";
import { config, sessionFileFor } from "./config.js";

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

/** AUTH_DIR ichidagi session.txt bor papkalarni sessions.json ga qo'shadi */
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
      await fs.access(sessionFileFor(id));
    } catch {
      continue;
    }
    console.log(`[boot] auth papka topildi, session qo'shiladi: ${id}`);
    out.push(await upsertSessionRecord(id, id));
    known.add(id);
  }
  return out;
}
