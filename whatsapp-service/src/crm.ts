import { config } from "./config.js";

export interface IncomingWhatsAppMessage {
  phone: string;
  text: string;
  messageId?: string;
  timestamp?: Date;
  /** true = xodim yozgan (fromMe) */
  fromMe?: boolean;
  employeeName?: string;
  employeeId?: string;
}

/** CRM POST /api/calls — source=whatsapp */
export async function forwardToCrm(msg: IncomingWhatsAppMessage): Promise<void> {
  const body = {
    phone: msg.phone,
    raw_transcript: msg.text,
    call_date: (msg.timestamp ?? new Date()).toISOString(),
    source: "whatsapp",
    direction: msg.fromMe ? "outgoing" : "incoming",
    from_me: Boolean(msg.fromMe),
    file_name: msg.messageId
      ? `wa:${msg.employeeId ? msg.employeeId.slice(0, 8) + ":" : ""}${msg.messageId}`
      : undefined,
    employee_name: msg.employeeName || undefined,
  };

  const url = `${config.crmApiUrl}/api/calls`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.crmApiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`CRM ${res.status}: ${text.slice(0, 400)}`);
  }

  const who = msg.fromMe ? "xodim" : "mijoz";
  console.log(
    `[crm] OK ${res.status} ${who} emp=${msg.employeeName ?? "-"} phone=${msg.phone} → ${text.slice(0, 100)}`
  );
}
