import { config } from "./config.js";
import {
  listSessionRecords,
  removeSessionRecord,
  upsertSessionRecord,
} from "./session-store.js";
import { WhatsAppSession } from "./session.js";

const sessions = new Map<string, WhatsAppSession>();

export function getSession(employeeId: string): WhatsAppSession | undefined {
  return sessions.get(employeeId);
}

export function listSessionsPublic() {
  return Array.from(sessions.values()).map((s) => s.toPublic());
}

export async function startSession(employeeId: string, employeeName: string): Promise<WhatsAppSession> {
  const id = employeeId.trim();
  const name = employeeName.trim();
  if (!id || !name) throw new Error("employeeId va employeeName talab qilinadi");

  let session = sessions.get(id);
  if (!session) {
    if (sessions.size >= config.maxSessions) {
      throw new Error(`Maksimal session soni: ${config.maxSessions}`);
    }
    session = new WhatsAppSession(id, name);
    sessions.set(id, session);
  } else {
    session.employeeName = name;
    session.runtime.employeeName = name;
  }

  await upsertSessionRecord(id, name);
  await session.start();
  return session;
}

export async function stopSession(employeeId: string, clearAuth = false): Promise<boolean> {
  const session = sessions.get(employeeId);
  if (!session) return false;
  await session.stop(clearAuth);
  sessions.delete(employeeId);
  await removeSessionRecord(employeeId);
  return true;
}

/** Boot: saqlangan sessionlarni qayta ishga tushirish */
export async function restoreSessions(): Promise<void> {
  const records = await listSessionRecords();
  console.log(`[boot] ${records.length} ta saqlangan session`);
  for (const r of records) {
    try {
      await startSession(r.employeeId, r.employeeName);
    } catch (e) {
      console.error(`[boot] session start failed ${r.employeeName}:`, e);
    }
  }
}
