import { promises as fs } from "node:fs";
import { TelegramClient, Api, sessions } from "telegram";
import { NewMessage } from "telegram/events/NewMessage.js";
import type { NewMessageEvent } from "telegram/events/NewMessage.js";
import { authDirFor, config, sessionFileFor } from "./config.js";
import { forwardToCrm } from "./crm.js";

const { StringSession } = sessions;

export type ConnectionStatus =
  | "starting"
  | "phone_needed"
  | "code_needed"
  | "password_needed"
  | "connecting"
  | "open"
  | "close"
  | "stopped";

export interface SessionRuntime {
  employeeId: string;
  employeeName: string;
  status: ConnectionStatus;
  lastError: string | null;
  connectedAt: string | null;
  me: string | null;
  phone: string | null;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = (e: Error) => rej(e);
  });
  return { promise, resolve, reject };
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw.trim();
  return raw.trim().startsWith("+") ? `+${digits}` : `+${digits}`;
}

/** Telegram foydalanuvchi identifikatori — telefon, username yoki tg:id */
export async function resolveContactId(
  client: TelegramClient,
  event: NewMessageEvent
): Promise<string> {
  const message = event.message;
  try {
    const sender = await message.getSender();
    if (sender && sender instanceof Api.User) {
      if (sender.phone) return normalizePhone(sender.phone);
      if (sender.username) return `@${sender.username}`;
      if (sender.id) return `tg:${sender.id.toString()}`;
    }
  } catch {
    /* ignore */
  }

  const peerId = message.peerId;
  if (peerId instanceof Api.PeerUser && peerId.userId) {
    return `tg:${peerId.userId.toString()}`;
  }
  if (peerId instanceof Api.PeerChannel && peerId.channelId) {
    return `tg:channel:${peerId.channelId.toString()}`;
  }

  return `tg:${message.id}`;
}

function extractText(event: NewMessageEvent): string | null {
  const message = event.message;
  const text = message.message?.trim();
  if (text) return text;

  if (message.media instanceof Api.MessageMediaPhoto) {
    return message.message?.trim() || "[rasm]";
  }
  if (message.media instanceof Api.MessageMediaDocument) {
    const doc = message.media.document;
    if (doc instanceof Api.Document) {
      const isVideo = doc.mimeType?.startsWith("video/");
      const isAudio = doc.mimeType?.startsWith("audio/");
      if (isVideo) return message.message?.trim() || "[video]";
      if (isAudio) return message.message?.trim() || "[audio xabar]";
      return message.message?.trim() || "[hujjat]";
    }
  }

  return null;
}

export class TelegramSession {
  readonly employeeId: string;
  employeeName: string;
  runtime: SessionRuntime;
  private client: TelegramClient | null = null;
  private stopped = false;
  private authTask: Promise<void> | null = null;
  private phoneDeferred: Deferred<string> | null = null;
  private codeDeferred: Deferred<string> | null = null;
  private passwordDeferred: Deferred<string> | null = null;
  private handlerBound = false;

  constructor(employeeId: string, employeeName: string) {
    this.employeeId = employeeId;
    this.employeeName = employeeName;
    this.runtime = {
      employeeId,
      employeeName,
      status: "starting",
      lastError: null,
      connectedAt: null,
      me: null,
      phone: null,
    };
  }

  private log(msg: string, ...args: unknown[]) {
    console.log(`[tg:${this.employeeName}]`, msg, ...args);
  }

  private async loadSessionString(): Promise<string> {
    try {
      return (await fs.readFile(sessionFileFor(this.employeeId), "utf8")).trim();
    } catch {
      return "";
    }
  }

  private async saveSessionString(): Promise<void> {
    if (!this.client) return;
    const dir = authDirFor(this.employeeId);
    await fs.mkdir(dir, { recursive: true });
    const saved = (this.client.session as sessions.StringSession).save();
    await fs.writeFile(sessionFileFor(this.employeeId), saved, "utf8");
  }

  private resetAuthDeferreds() {
    this.phoneDeferred = deferred<string>();
    this.codeDeferred = deferred<string>();
    this.passwordDeferred = deferred<string>();
  }

  private rejectAuthDeferreds(err: Error) {
    this.phoneDeferred?.reject(err);
    this.codeDeferred?.reject(err);
    this.passwordDeferred?.reject(err);
  }

  private async buildClient(): Promise<TelegramClient> {
    const sessionString = await this.loadSessionString();
    const client = new TelegramClient(
      new StringSession(sessionString),
      config.apiId,
      config.apiHash,
      { connectionRetries: 5, autoReconnect: true }
    );
    return client;
  }

  private async describeMe(): Promise<string | null> {
    if (!this.client) return null;
    try {
      const me = await this.client.getMe();
      if (me.phone) return normalizePhone(me.phone);
      if (me.username) return `@${me.username}`;
      if (me.id) return `tg:${me.id.toString()}`;
    } catch {
      /* ignore */
    }
    return null;
  }

  private async onAuthorized(): Promise<void> {
    if (!this.client || this.stopped) return;
    await this.saveSessionString();
    this.runtime.status = "open";
    this.runtime.lastError = null;
    this.runtime.connectedAt = new Date().toISOString();
    this.runtime.me = await this.describeMe();
    this.log("ulandi:", this.runtime.me);
    await this.attachMessageHandler();
  }

  private async attachMessageHandler(): Promise<void> {
    if (!this.client || this.handlerBound) return;
    this.handlerBound = true;

    this.client.addEventHandler(async (event: NewMessageEvent) => {
      if (this.stopped) return;
      try {
        await this.handleMessage(event);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        console.error(`[tg:${this.employeeName}] message xato:`, err);
        this.runtime.lastError = err;
      }
    }, new NewMessage({}));
  }

  private async handleMessage(event: NewMessageEvent): Promise<void> {
    const message = event.message;
    if (!message) return;

    if (config.ignoreGroups) {
      if (message.isGroup || message.isChannel) return;
    }

    const text = extractText(event);
    if (!text) {
      this.log("matn yo'q, skip");
      return;
    }

    if (!this.client) return;
    const phone = await resolveContactId(this.client, event);
    const ts = message.date ? new Date(message.date * 1000) : new Date();

    await forwardToCrm({
      phone,
      text,
      messageId: message.id?.toString(),
      timestamp: ts,
      fromMe: Boolean(message.out),
      employeeName: this.employeeName,
      employeeId: this.employeeId,
    });
  }

  private async beginInteractiveAuth(): Promise<void> {
    if (!this.client) return;
    this.resetAuthDeferreds();
    this.runtime.status = "phone_needed";

    this.authTask = this.client
      .start({
        phoneNumber: async () => {
          this.runtime.status = "phone_needed";
          this.log("telefon kutilmoqda");
          return this.phoneDeferred!.promise;
        },
        phoneCode: async () => {
          this.runtime.status = "code_needed";
          this.log("kod kutilmoqda");
          return this.codeDeferred!.promise;
        },
        password: async () => {
          this.runtime.status = "password_needed";
          this.log("2FA parol kutilmoqda");
          return this.passwordDeferred!.promise;
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.runtime.lastError = msg;
          this.log("auth xato:", msg);
        },
      })
      .then(async () => {
        if (!this.stopped) await this.onAuthorized();
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        this.runtime.status = "close";
        this.runtime.lastError = msg;
        this.log("auth failed:", msg);
      });
  }

  async start(): Promise<void> {
    this.stopped = false;
    this.handlerBound = false;
    this.runtime.status = "starting";
    this.runtime.lastError = null;

    try {
      this.client?.disconnect().catch(() => undefined);
    } catch {
      /* ignore */
    }

    this.client = await this.buildClient();
    this.runtime.status = "connecting";

    try {
      await this.client.connect();
      const authorized = await this.client.isUserAuthorized();
      if (authorized) {
        await this.onAuthorized();
        return;
      }
      await this.beginInteractiveAuth();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.runtime.status = "close";
      this.runtime.lastError = msg;
      this.log("start xato:", msg);
    }
  }

  submitPhone(phone: string): void {
    const normalized = phone.trim();
    if (!normalized) throw new Error("Telefon raqam talab qilinadi");
    this.runtime.phone = normalized;
    if (!this.phoneDeferred) throw new Error("Session telefon kutmayapti");
    this.phoneDeferred.resolve(normalized);
    this.runtime.status = "code_needed";
  }

  submitCode(code: string): void {
    const normalized = code.trim();
    if (!normalized) throw new Error("Kod talab qilinadi");
    if (!this.codeDeferred) throw new Error("Session kod kutmayapti");
    this.codeDeferred.resolve(normalized);
  }

  submitPassword(password: string): void {
    const normalized = password.trim();
    if (!normalized) throw new Error("Parol talab qilinadi");
    if (!this.passwordDeferred) throw new Error("Session parol kutmayapti");
    this.passwordDeferred.resolve(normalized);
  }

  async stop(clearAuth = false): Promise<void> {
    this.stopped = true;
    this.rejectAuthDeferreds(new Error("Session to'xtatildi"));

    try {
      await this.client?.disconnect();
    } catch {
      /* ignore */
    }

    this.client = null;
    this.authTask = null;
    this.phoneDeferred = null;
    this.codeDeferred = null;
    this.passwordDeferred = null;
    this.handlerBound = false;
    this.runtime.status = "stopped";
    this.runtime.connectedAt = null;
    this.runtime.me = null;
    this.runtime.phone = null;

    if (clearAuth) {
      try {
        await fs.rm(authDirFor(this.employeeId), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }

  toPublic() {
    return {
      employeeId: this.employeeId,
      employeeName: this.employeeName,
      status: this.runtime.status,
      me: this.runtime.me,
      phone: this.runtime.phone,
      connectedAt: this.runtime.connectedAt,
      lastError: this.runtime.lastError,
    };
  }
}
