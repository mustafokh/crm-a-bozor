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
