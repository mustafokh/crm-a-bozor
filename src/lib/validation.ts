import { parsePhoneNumberFromString } from "libphonenumber-js";

// Shared, framework-agnostic validators. Used by both client forms and API
// routes so the rules stay identical on both sides. Each validator returns a
// map of field -> Uzbek error message (empty map = valid).

export type Errors = Record<string, string>;

const CURRENT_YEAR = new Date().getFullYear();

export interface CarInput {
  make?: string;
  model?: string;
  year?: number | string;
  mileage?: number | string;
  purchasePrice?: number | string;
  salePrice?: number | string;
  engineVolume?: number | string | null;
  vin?: string | null;
  currency?: string;
  condition?: string;
  status?: string;
}

function num(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function validateCar(data: CarInput): Errors {
  const e: Errors = {};

  if (!data.make || !String(data.make).trim()) e.make = "Markani tanlang";
  if (!data.model || !String(data.model).trim()) e.model = "Modelni kiriting";
  else if (String(data.model).length > 60) e.model = "Model juda uzun (60 belgidan kam)";

  const year = num(data.year);
  if (year === null || Number.isNaN(year)) e.year = "Yilni kiriting";
  else if (!Number.isInteger(year) || year < 1950 || year > CURRENT_YEAR + 1)
    e.year = `Yil 1950 va ${CURRENT_YEAR + 1} orasida bo'lishi kerak`;

  const mileage = num(data.mileage);
  if (mileage === null) {
    /* optional-ish; default 0 handled by API */
  } else if (Number.isNaN(mileage) || mileage < 0 || mileage > 2_000_000)
    e.mileage = "Probeg 0 va 2 000 000 km orasida bo'lishi kerak";

  const purchase = num(data.purchasePrice);
  if (purchase === null || Number.isNaN(purchase) || purchase < 0)
    e.purchasePrice = "Sotib olingan narx 0 dan katta bo'lishi kerak";

  const sale = num(data.salePrice);
  if (sale === null || Number.isNaN(sale) || sale < 0)
    e.salePrice = "Sotish narxi 0 dan katta bo'lishi kerak";

  const engine = num(data.engineVolume);
  if (engine !== null && (Number.isNaN(engine) || engine < 0.1 || engine > 12))
    e.engineVolume = "Dvigatel hajmi 0.1 va 12 L orasida bo'lishi kerak";

  if (data.vin && String(data.vin).trim()) {
    const vin = String(data.vin).trim();
    if (vin.length < 5 || vin.length > 20) e.vin = "VIN 5–20 belgidan iborat bo'lishi kerak";
    else if (!/^[A-Za-z0-9]+$/.test(vin)) e.vin = "VIN faqat harf va raqamdan iborat bo'lsin";
  }

  if (data.currency && !["USD", "UZS"].includes(data.currency)) e.currency = "Valyuta noto'g'ri";
  if (data.condition && !["NEW", "USED"].includes(data.condition)) e.condition = "Holat noto'g'ri";
  if (data.status && !["IN_STOCK", "RESERVED", "SOLD", "IN_TRANSIT"].includes(data.status))
    e.status = "Status noto'g'ri";

  return e;
}

const PHONE_HINT = "Masalan: +998 90 123 45 67 yoki +971 50 123 4567";

/** Xalqaro telefon: +971, +998, +7 va boshqalar */
export function isValidPhone(phone: string): boolean {
  const raw = phone.trim();
  if (!raw) return false;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;

  // Lokal Oʻzbekiston: 9 ta raqam (90…)
  if (/^\d{9}$/.test(digits)) return true;

  const candidates = [
    raw.startsWith("+") ? raw : `+${digits}`,
    digits.startsWith("00") ? `+${digits.slice(2)}` : null,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    try {
      const parsed = parsePhoneNumberFromString(c);
      if (parsed?.isValid()) return true;
      // Ba'zi yangi/mobil raqamlar isValid=false, lekin country aniqlangan
      if (parsed?.country && parsed.nationalNumber.length >= 6) return true;
    } catch {
      /* ignore */
    }
  }

  // E.164 tashqi format: + va 8–15 raqam
  if (raw.includes("+") && digits.length >= 8 && digits.length <= 15) return true;

  return false;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export interface CustomerInput {
  fullName?: string;
  phone?: string;
  email?: string | null;
  passportSeries?: string | null;
}

export function validateCustomer(data: CustomerInput): Errors {
  const e: Errors = {};

  if (!data.fullName || !String(data.fullName).trim()) e.fullName = "F.I.O ni kiriting";
  else if (String(data.fullName).trim().length < 3) e.fullName = "F.I.O juda qisqa";

  if (!data.phone || !String(data.phone).trim()) e.phone = "Telefon raqamni kiriting";
  else if (!isValidPhone(String(data.phone)))
    e.phone = `Telefon formati noto'g'ri (${PHONE_HINT})`;

  if (data.email && String(data.email).trim() && !isValidEmail(String(data.email).trim()))
    e.email = "Email formati noto'g'ri";

  if (data.passportSeries && String(data.passportSeries).trim()) {
    const p = String(data.passportSeries).trim().toUpperCase().replace(/\s+/g, " ");
    if (!/^[A-Z]{2}\s?\d{7}$/.test(p)) e.passportSeries = "Pasport formati: AA 1234567";
  }

  return e;
}

export interface LeadInput {
  fullName?: string;
  phone?: string;
  source?: string;
  budget?: number | string | null;
}

export function validateLead(data: LeadInput): Errors {
  const e: Errors = {};

  if (!data.fullName || !String(data.fullName).trim()) e.fullName = "Ismni kiriting";
  if (!data.phone || !String(data.phone).trim()) e.phone = "Telefon raqamni kiriting";
  else if (!isValidPhone(String(data.phone)))
    e.phone = `Telefon formati noto'g'ri (${PHONE_HINT})`;

  if (data.budget !== null && data.budget !== undefined && data.budget !== "") {
    const b = Number(data.budget);
    if (!Number.isFinite(b) || b < 0) e.budget = "Byudjet 0 dan katta son bo'lishi kerak";
  }

  return e;
}

export interface ExpenseInput {
  amount?: number | string;
  category?: string;
  date?: string;
}

export function validateExpense(data: ExpenseInput): Errors {
  const e: Errors = {};

  const amount = Number(data.amount);
  if (data.amount === undefined || data.amount === "" || !Number.isFinite(amount) || amount <= 0)
    e.amount = "Summa 0 dan katta bo'lishi kerak";

  if (!data.category) e.category = "Kategoriyani tanlang";

  if (data.date && Number.isNaN(Date.parse(String(data.date)))) e.date = "Sana noto'g'ri";

  return e;
}

export function hasErrors(e: Errors): boolean {
  return Object.keys(e).length > 0;
}
