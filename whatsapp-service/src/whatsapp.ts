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
import pino from "pino";
import QRCode from "qrcode";
import { config } from "./config.js";
import { forwardToCrm } from "./crm.js";

export type ConnectionStatus = "starting" | "qr" | "connecting" | "open" | "close";

export interface WhatsAppRuntimeState {
  status: ConnectionStatus;
  lastQr: string | null;
  lastQrAt: string | null;
  lastError: string | null;
  connectedAt: string | null;
  me: string | null;
}

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

export const runtime: WhatsAppRuntimeState = {
  status: "starting",
  lastQr: null,
  lastQrAt: null,
  lastError: null,
  connectedAt: null,
  me: null,
};

let sock: WASocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

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

  // Audio / sticker / media without caption — optional note
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

async function handleMessage(msg: WAMessage): Promise<void> {
  const remote = msg.key.remoteJid;
  if (!remote) return;
  if (isJidBroadcast(remote) || isJidStatusBroadcast(remote)) return;
  if (config.ignoreGroups && isJidGroup(remote)) return;

  const phone = jidToPhone(remote);
  if (!phone) {
    console.warn("[wa] telefon ajratilmadi:", remote);
    return;
  }

  const text = extractText(msg);
  if (!text) {
    console.log("[wa] matn yo‘q, o‘tkazib yuborildi:", remote);
    return;
  }

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
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[crm] yuborish xatosi:", err);
    runtime.lastError = err;
  }
}

function scheduleReconnect(ms = 3000) {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    startWhatsApp().catch((e) => {
      console.error("[wa] reconnect failed:", e);
      scheduleReconnect(5000);
    });
  }, ms);
}

export async function startWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
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

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      runtime.status = "qr";
      runtime.lastQr = qr;
      runtime.lastQrAt = new Date().toISOString();
      runtime.connectedAt = null;
      console.log("[wa] QR tayyor — brauzerda /qr oching yoki /qr.png");
      try {
        const terminal = await QRCode.toString(qr, { type: "terminal", small: true });
        console.log(terminal);
      } catch {
        /* ignore */
      }
    }

    if (connection === "connecting") {
      runtime.status = "connecting";
    }

    if (connection === "open") {
      runtime.status = "open";
      runtime.lastQr = null;
      runtime.lastError = null;
      runtime.connectedAt = new Date().toISOString();
      runtime.me = sock?.user?.id ? jidToPhone(sock.user.id) : sock?.user?.id ?? null;
      console.log("[wa] ulandi:", runtime.me);
    }

    if (connection === "close") {
      runtime.status = "close";
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      runtime.lastError = lastDisconnect?.error?.message ?? `close:${statusCode}`;
      console.warn("[wa] uzildi:", runtime.lastError);

      if (loggedOut) {
        console.error("[wa] sessiyadan chiqildi — AUTH_DIR ni tozalab QR qayta skanerlang");
        runtime.lastQr = null;
      } else {
        scheduleReconnect(3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      await handleMessage(msg);
    }
  });
}

export async function getQrPng(): Promise<Buffer | null> {
  if (!runtime.lastQr) return null;
  return QRCode.toBuffer(runtime.lastQr, { type: "png", width: 360, margin: 2 });
}
