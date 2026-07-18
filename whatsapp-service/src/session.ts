import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  getContentType,
  isJidBroadcast,
  isJidGroup,
  isJidStatusBroadcast,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { promises as fs } from "node:fs";
import pino from "pino";
import QRCode from "qrcode";
import { authDirFor, config } from "./config.js";
import { forwardToCrm } from "./crm.js";

export type ConnectionStatus = "starting" | "qr" | "connecting" | "open" | "close" | "stopped";

export interface SessionRuntime {
  employeeId: string;
  employeeName: string;
  status: ConnectionStatus;
  lastQr: string | null;
  lastQrAt: string | null;
  lastError: string | null;
  connectedAt: string | null;
  me: string | null;
}

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

function lidUser(jid: string | null | undefined): string | null {
  if (!jid) return null;
  if (!jid.toLowerCase().endsWith("@lid")) return null;
  return jid.split("@")[0]?.split(":")[0] || null;
}

/** 998901234567@s.whatsapp.net → +998901234567 (LID @lid emas) */
export function jidToPhone(jid: string): string | null {
  const lower = jid.toLowerCase();
  // Linked ID — telefon emas; senderPn / LID cache kerak
  if (lower.endsWith("@lid")) return null;
  if (lower.endsWith("@g.us") || lower.endsWith("@broadcast")) return null;

  const user = jid.split("@")[0]?.split(":")[0];
  if (!user) return null;
  const digits = user.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

function extractText(msg: WAMessage): string | null {
  const m = msg.message;
  if (!m) return null;

  if (typeof m.conversation === "string" && m.conversation.trim()) {
    return m.conversation.trim();
  }
  if (m.extendedTextMessage?.text?.trim()) {
    return m.extendedTextMessage.text.trim();
  }
  if (m.imageMessage?.caption?.trim()) return m.imageMessage.caption.trim();
  if (m.videoMessage?.caption?.trim()) return m.videoMessage.caption.trim();
  if (m.documentMessage?.caption?.trim()) return m.documentMessage.caption.trim();
  if (m.buttonsResponseMessage?.selectedDisplayText?.trim()) {
    return m.buttonsResponseMessage.selectedDisplayText.trim();
  }
  if (m.listResponseMessage?.title?.trim()) {
    return m.listResponseMessage.title.trim();
  }
  if (m.templateButtonReplyMessage?.selectedDisplayText?.trim()) {
    return m.templateButtonReplyMessage.selectedDisplayText.trim();
  }

  if (!config.textOnly) {
    const type = getContentType(m);
    if (type === "audioMessage") return "[audio xabar]";
    if (type === "stickerMessage") return "[sticker]";
    if (type === "imageMessage") return "[rasm]";
    if (type === "videoMessage") return "[video]";
    if (type === "documentMessage") {
      return `[hujjat] ${m.documentMessage?.fileName ?? ""}`.trim();
    }
  }

  return null;
}

export class WhatsAppSession {
  readonly employeeId: string;
  employeeName: string;
  runtime: SessionRuntime;
  private sock: WASocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = false;
  /** LID user → +phone (WhatsApp LID addressing) */
  private lidToPhone = new Map<string, string>();

  constructor(employeeId: string, employeeName: string) {
    this.employeeId = employeeId;
    this.employeeName = employeeName;
    this.runtime = {
      employeeId,
      employeeName,
      status: "starting",
      lastQr: null,
      lastQrAt: null,
      lastError: null,
      connectedAt: null,
      me: null,
    };
  }

  private authDir(): string {
    return authDirFor(this.employeeId);
  }

  private lidMapPath(): string {
    return `${this.authDir()}/lid-phone-map.json`;
  }

  private log(msg: string, ...args: unknown[]) {
    console.log(`[wa:${this.employeeName}]`, msg, ...args);
  }

  private async loadLidMap(): Promise<void> {
    try {
      const raw = await fs.readFile(this.lidMapPath(), "utf8");
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) {
        if (k && v?.startsWith("+")) this.lidToPhone.set(k, v);
      }
      if (this.lidToPhone.size) {
        this.log(`LID map yuklandi: ${this.lidToPhone.size}`);
      }
    } catch {
      /* yo'q */
    }
  }

  private async saveLidMap(): Promise<void> {
    try {
      const obj = Object.fromEntries(this.lidToPhone);
      await fs.writeFile(this.lidMapPath(), JSON.stringify(obj), "utf8");
    } catch (e) {
      this.log("LID map saqlash xato:", e);
    }
  }

  private rememberLidPhone(lidJid: string | null | undefined, pnJid: string | null | undefined) {
    const user = lidUser(lidJid);
    const phone = pnJid ? jidToPhone(pnJid) : null;
    if (!user || !phone) return;
    if (this.lidToPhone.get(user) === phone) return;
    this.lidToPhone.set(user, phone);
    void this.saveLidMap();
  }

  /** Baileys LID: telefon senderPn / cache / klasik JID dan */
  private resolveMessagePhone(msg: WAMessage): string | null {
    const key = msg.key as WAMessage["key"] & {
      senderPn?: string | null;
      participantPn?: string | null;
      remoteJidAlt?: string | null;
      participantAlt?: string | null;
      senderLid?: string | null;
      participantLid?: string | null;
    };

    const pnCandidates = [
      key.senderPn,
      key.participantPn,
      key.remoteJidAlt,
      key.participantAlt,
      key.remoteJid,
      key.participant,
    ];
    let phone: string | null = null;
    let pnSource: string | null = null;
    for (const jid of pnCandidates) {
      if (!jid) continue;
      const p = jidToPhone(jid);
      if (p) {
        phone = p;
        pnSource = jid;
        break;
      }
    }

    if (phone && pnSource) {
      this.rememberLidPhone(key.remoteJid, pnSource);
      this.rememberLidPhone(key.senderLid, key.senderPn || pnSource);
      this.rememberLidPhone(key.participantLid, key.participantPn || pnSource);
      return phone;
    }

    for (const lid of [key.remoteJid, key.senderLid, key.participantLid, key.participant]) {
      const user = lidUser(lid);
      if (user && this.lidToPhone.has(user)) return this.lidToPhone.get(user)!;
    }

    // Oxirgi chora: LID raqami (xabar CRM ga tushsin; keyinroq mapping to'ldiriladi)
    const fallbackLid = lidUser(key.remoteJid);
    if (fallbackLid && fallbackLid.length >= 10 && fallbackLid.length <= 15) {
      this.log("LID fallback telefon:", fallbackLid);
      return `+${fallbackLid}`;
    }
    return null;
  }

  private async handleMessage(msg: WAMessage): Promise<void> {
    const remote = msg.key.remoteJid;
    if (!remote) return;
    if (isJidBroadcast(remote) || isJidStatusBroadcast(remote)) return;
    if (config.ignoreGroups && isJidGroup(remote)) return;

    const phone = this.resolveMessagePhone(msg);
    if (!phone) {
      const k = msg.key as {
        senderPn?: string;
        participantPn?: string;
        remoteJidAlt?: string;
        senderLid?: string;
      };
      this.log(
        "telefon ajratilmadi:",
        remote,
        `senderPn=${k.senderPn ?? "-"}`,
        `participantPn=${k.participantPn ?? "-"}`,
        `alt=${k.remoteJidAlt ?? "-"}`,
        `lidMap=${this.lidToPhone.size}`
      );
      return;
    }

    const text = extractText(msg);
    if (!text) return;

    const ts = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * 1000)
      : new Date();

    try {
      await forwardToCrm({
        phone,
        text,
        messageId: msg.key.id ?? undefined,
        timestamp: ts,
        fromMe: Boolean(msg.key.fromMe),
        employeeName: this.employeeName,
        employeeId: this.employeeId,
      });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.error(`[wa:${this.employeeName}] crm xato:`, err);
      this.runtime.lastError = err;
    }
  }

  private scheduleReconnect(ms = 3000) {
    if (this.stopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.start().catch((e) => {
        console.error(`[wa:${this.employeeName}] reconnect failed:`, e);
        this.scheduleReconnect(5000);
      });
    }, ms);
  }

  async start(): Promise<void> {
    this.stopped = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Eski socketni yopish
    try {
      this.sock?.ev?.removeAllListeners("connection.update");
      this.sock?.ev?.removeAllListeners("creds.update");
      this.sock?.ev?.removeAllListeners("messages.upsert");
      this.sock?.ev?.removeAllListeners("chats.phoneNumberShare");
      this.sock?.ev?.removeAllListeners("contacts.upsert");
      this.sock?.ev?.removeAllListeners("contacts.update");
      this.sock?.end?.(undefined);
    } catch {
      /* ignore */
    }
    this.sock = null;

    const dir = this.authDir();
    await fs.mkdir(dir, { recursive: true });
    await this.loadLidMap();

    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    this.runtime.status = "starting";
    this.runtime.lastError = null;

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => undefined,
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("chats.phoneNumberShare", ({ lid, jid }) => {
      this.rememberLidPhone(lid, jid);
    });

    const ingestContacts = (
      contacts: { id?: string; lid?: string; jid?: string }[]
    ) => {
      for (const c of contacts) {
        const lid = c.lid || (c.id?.endsWith("@lid") ? c.id : undefined);
        const pn = c.jid || (c.id?.endsWith("@s.whatsapp.net") ? c.id : undefined);
        this.rememberLidPhone(lid, pn);
      }
    };
    this.sock.ev.on("contacts.upsert", ingestContacts);
    this.sock.ev.on("contacts.update", ingestContacts);

    this.sock.ev.on("connection.update", async (update) => {
      if (this.stopped) return;
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.runtime.status = "qr";
        this.runtime.lastQr = qr;
        this.runtime.lastQrAt = new Date().toISOString();
        this.runtime.connectedAt = null;
        this.log("QR tayyor");
      }

      if (connection === "connecting") {
        this.runtime.status = "connecting";
      }

      if (connection === "open") {
        this.runtime.status = "open";
        this.runtime.lastQr = null;
        this.runtime.lastError = null;
        this.runtime.connectedAt = new Date().toISOString();
        this.runtime.me = this.sock?.user?.id
          ? jidToPhone(this.sock.user.id)
          : this.sock?.user?.id ?? null;
        this.log("ulandi:", this.runtime.me);
      }

      if (connection === "close") {
        this.runtime.status = "close";
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        this.runtime.lastError = lastDisconnect?.error?.message ?? `close:${statusCode}`;
        this.log("uzildi:", this.runtime.lastError);

        if (loggedOut) {
          this.runtime.lastQr = null;
          this.log("sessiyadan chiqildi — QR qayta skanerlang");
        } else if (!this.stopped) {
          this.scheduleReconnect(3000);
        }
      }
    });

    this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (this.stopped) return;
      if (type !== "notify") return;
      for (const msg of messages) {
        await this.handleMessage(msg);
      }
    });
  }

  async stop(clearAuth = false): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.sock?.ev?.removeAllListeners("connection.update");
      this.sock?.ev?.removeAllListeners("creds.update");
      this.sock?.ev?.removeAllListeners("messages.upsert");
      this.sock?.ev?.removeAllListeners("chats.phoneNumberShare");
      this.sock?.ev?.removeAllListeners("contacts.upsert");
      this.sock?.ev?.removeAllListeners("contacts.update");
      this.sock?.end?.(undefined);
    } catch {
      /* ignore */
    }
    this.sock = null;
    this.runtime.status = "stopped";
    this.runtime.lastQr = null;
    this.runtime.connectedAt = null;
    this.runtime.me = null;

    if (clearAuth) {
      try {
        await fs.rm(this.authDir(), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }

  async getQrPng(): Promise<Buffer | null> {
    if (!this.runtime.lastQr) return null;
    return QRCode.toBuffer(this.runtime.lastQr, { type: "png", width: 360, margin: 2 });
  }

  toPublic() {
    return {
      employeeId: this.employeeId,
      employeeName: this.employeeName,
      status: this.runtime.status,
      me: this.runtime.me,
      connectedAt: this.runtime.connectedAt,
      lastError: this.runtime.lastError,
      hasQr: Boolean(this.runtime.lastQr),
      lastQrAt: this.runtime.lastQrAt,
    };
  }
}
