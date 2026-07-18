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

/** 998901234567@s.whatsapp.net → +998901234567 */
export function jidToPhone(jid: string): string | null {
  const user = jid.split("@")[0]?.split(":")[0];
  if (!user) return null;
  const digits = user.replace(/\D/g, "");
  if (digits.length < 8) return null;
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

  private log(msg: string, ...args: unknown[]) {
    console.log(`[wa:${this.employeeName}]`, msg, ...args);
  }

  private async handleMessage(msg: WAMessage): Promise<void> {
    const remote = msg.key.remoteJid;
    if (!remote) return;
    if (isJidBroadcast(remote) || isJidStatusBroadcast(remote)) return;
    if (config.ignoreGroups && isJidGroup(remote)) return;

    const phone = jidToPhone(remote);
    if (!phone) {
      this.log("telefon ajratilmadi:", remote);
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
      this.sock?.end?.(undefined);
    } catch {
      /* ignore */
    }
    this.sock = null;

    const dir = this.authDir();
    await fs.mkdir(dir, { recursive: true });

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
