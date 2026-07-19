import { config } from "./config.js";
import {
  discoverAuthSessions,
  listSessionRecords,
  removeSessionRecord,
  upsertSessionRecord,
} from "./session-store.js";
import { TelegramSession } from "./session.js";

const sessions = new Map<string, TelegramSession>();

export function getSession(employeeId: string): TelegramSession | undefined {
  return sessions.get(employeeId);
}

export function listSessionsPublic() {
  return Array.from(sessions.values()).map((s) => s.toPublic());
}

export async function startSession(employeeId: string, employeeName: string): Promise<TelegramSession> {
  const id = employeeId.trim();
  const name = employeeName.trim();
  if (!id || !name) throw new Error("employeeId va employeeName talab qilinadi");

  let session = sessions.get(id);
  if (!session) {
    if (sessions.size >= config.maxSessions) {
      throw new Error(`Maksimal session soni: ${config.maxSessions}`);
    }
    session = new TelegramSession(id, name);
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

export function submitPhone(employeeId: string, phone: string): TelegramSession {
  const session = sessions.get(employeeId);
  if (!session) throw new Error("Session topilmadi");
  session.submitPhone(phone);
  return session;
}

export function submitCode(employeeId: string, code: string): TelegramSession {
  const session = sessions.get(employeeId);
  if (!session) throw new Error("Session topilmadi");
  session.submitCode(code);
  return session;
}

export function submitPassword(employeeId: string, password: string): TelegramSession {
  const session = sessions.get(employeeId);
  if (!session) throw new Error("Session topilmadi");
  session.submitPassword(password);
  return session;
}

export async function restoreSessions(): Promise<void> {
  let records = await listSessionRecords();
  try {
    records = await discoverAuthSessions(records);
  } catch (e) {
    console.error("[boot] auth discover xato:", e);
  }

  console.log(`[boot] ${records.length} ta saqlangan session`);
  for (const r of records) {
    try {
      await startSession(r.employeeId, r.employeeName);
    } catch (e) {
      console.error(`[boot] session start failed ${r.employeeName}:`, e);
    }
  }
}
