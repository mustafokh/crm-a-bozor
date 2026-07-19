import "dotenv/config";
import path from "node:path";

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} env majburiy`);
  return v;
}

function requiredInt(name: string): number {
  const n = Number(required(name));
  if (!Number.isFinite(n)) throw new Error(`${name} raqam bo'lishi kerak`);
  return Math.floor(n);
}

const authDir = process.env.AUTH_DIR?.trim() || "./auth_info";

export const config = {
  apiId: requiredInt("TELEGRAM_API_ID"),
  apiHash: required("TELEGRAM_API_HASH"),
  crmApiUrl: (process.env.CRM_API_URL || "https://mkus-crm-fed7cd.azurewebsites.net").replace(
    /\/$/,
    ""
  ),
  crmApiKey: required("CRM_API_KEY"),
  serviceApiKey: process.env.SERVICE_API_KEY?.trim() || process.env.CRM_API_KEY?.trim() || "",
  authDir,
  sessionsFile:
    process.env.SESSIONS_FILE?.trim() || path.join(path.dirname(authDir), "sessions.json"),
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST?.trim() || "0.0.0.0",
  ignoreGroups: (process.env.IGNORE_GROUPS ?? "true").toLowerCase() !== "false",
  maxSessions: Math.max(1, Number(process.env.MAX_SESSIONS || 10)),
};

export function authDirFor(employeeId: string): string {
  const safe = employeeId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(config.authDir, safe);
}

export function sessionFileFor(employeeId: string): string {
  return path.join(authDirFor(employeeId), "session.txt");
}
