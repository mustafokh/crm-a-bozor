// Centralised enums, labels (Uzbek) and colour classes used across the app.

export type Role = "ADMIN" | "MANAGER" | "ACCOUNTANT" | "WAREHOUSE";

export const ROLES: Record<Role, string> = {
  ADMIN: "Admin / Direktor",
  MANAGER: "Sotuv menejeri",
  ACCOUNTANT: "Buxgalter",
  WAREHOUSE: "Ombor / Logistika",
};

export const CAR_STATUS: Record<string, string> = {
  IN_STOCK: "Omborda",
  RESERVED: "Band qilingan",
  SOLD: "Sotilgan",
  IN_TRANSIT: "Yo'lda",
};

export const CAR_STATUS_COLOR: Record<string, string> = {
  IN_STOCK: "bg-success/15 text-success",
  RESERVED: "bg-warning/15 text-warning",
  SOLD: "bg-muted text-muted-foreground",
  IN_TRANSIT: "bg-primary/15 text-primary",
};

export const CAR_CONDITION: Record<string, string> = {
  NEW: "Yangi",
  USED: "Ishlatilgan",
};

export const TRANSMISSION: Record<string, string> = {
  AUTOMATIC: "Avtomat",
  MANUAL: "Mexanika",
  CVT: "Variator (CVT)",
  ROBOT: "Robot",
};

export const FUEL_TYPE: Record<string, string> = {
  PETROL: "Benzin",
  DIESEL: "Dizel",
  HYBRID: "Gibrid",
  ELECTRIC: "Elektro",
  GAS: "Gaz",
};

export const DRIVETRAIN: Record<string, string> = {
  FWD: "Old (FWD)",
  RWD: "Orqa (RWD)",
  AWD: "To'liq (AWD)",
};

export const INCOMING_STATUS: Record<string, string> = {
  ORDERED: "Buyurtma qilindi",
  IN_TRANSIT: "Yo'lda",
  CUSTOMS: "Bojxonada",
  ARRIVED: "Omborga tushdi",
};

export const INCOMING_STATUS_COLOR: Record<string, string> = {
  ORDERED: "bg-muted text-muted-foreground",
  IN_TRANSIT: "bg-primary/15 text-primary",
  CUSTOMS: "bg-warning/15 text-warning",
  ARRIVED: "bg-success/15 text-success",
};

export const LEAD_SOURCE: Record<string, string> = {
  WEBSITE: "Sayt",
  INSTAGRAM: "Instagram",
  TELEGRAM: "Telegram",
  WHATSAPP: "WhatsApp",
  CALL: "Qo'ng'iroq",
  REFERRAL: "Tavsiya",
  OTHER: "Boshqa",
};

/** Asosiy 3 ta kanal — qo'ng'iroq, WhatsApp, Telegram */
export const CHANNEL_SOURCES = ["CALL", "WHATSAPP", "TELEGRAM"] as const;

/** Kanal ranglari — qator chap chizig'i, badge, tab */
export const CHANNEL_COLOR: Record<string, {
  line: string;
  badge: string;
  tab: string;
  tabActive: string;
  row: string;
}> = {
  CALL: {
    line: "border-l-4 border-l-blue-500",
    badge: "bg-blue-500/15 text-blue-700 border border-blue-500/30",
    tab: "border-blue-500/40 text-blue-700 hover:bg-blue-500/10",
    tabActive: "bg-blue-500 text-white border-blue-500 shadow-sm",
    row: "bg-blue-500/[0.04]",
  },
  WHATSAPP: {
    line: "border-l-4 border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30",
    tab: "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10",
    tabActive: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
    row: "bg-emerald-500/[0.04]",
  },
  TELEGRAM: {
    line: "border-l-4 border-l-sky-500",
    badge: "bg-sky-500/15 text-sky-700 border border-sky-500/30",
    tab: "border-sky-500/40 text-sky-700 hover:bg-sky-500/10",
    tabActive: "bg-sky-500 text-white border-sky-500 shadow-sm",
    row: "bg-sky-500/[0.04]",
  },
};

export const LEAD_STATUS: Record<string, string> = {
  NEW: "Yangi",
  ACTIVE: "Jarayonda",
  CLOSED: "Yopilgan",
};

export const LEAD_OUTCOME: Record<string, string> = {
  THINKING: "O'ylab ko'radi",
  CALLBACK: "Qayta qo'ng'iroq",
  NO_ANSWER: "Javob bermadi",
  NEGOTIATION: "Kelishuv davom etmoqda",
  AGREED: "Kelishildi",
  REJECTED: "Rad etdi",
  BOUGHT: "Sotib oldi",
  NOT_INTERESTED: "Qiziqmaydi",
};

export const LEAD_OUTCOMES = Object.keys(LEAD_OUTCOME);

export const LEAD_OUTCOME_COLOR: Record<string, string> = {
  THINKING: "bg-muted text-muted-foreground",
  CALLBACK: "bg-primary/15 text-primary",
  NO_ANSWER: "bg-warning/15 text-warning",
  NEGOTIATION: "bg-indigo-500/15 text-indigo-600",
  AGREED: "bg-success/15 text-success",
  REJECTED: "bg-destructive/15 text-destructive",
  BOUGHT: "bg-emerald-500/15 text-emerald-700",
  NOT_INTERESTED: "bg-rose-500/15 text-rose-600",
};

export const CALL_OUTCOME: Record<string, string> = {
  purchased: "Sotib oldi",
  not_purchased: "Sotib olmadi",
  pending: "Kutilmoqda",
  callback_needed: "Qayta qo'ng'iroq",
};

export const CALL_OUTCOMES = Object.keys(CALL_OUTCOME);

export const CALL_OUTCOME_COLOR: Record<string, string> = {
  purchased: "bg-success/15 text-success",
  not_purchased: "bg-destructive/15 text-destructive",
  pending: "bg-warning/15 text-warning",
  callback_needed: "bg-primary/15 text-primary",
};

export const CALL_LEAD_SOURCE: Record<string, string> = {
  website: "Sayt",
  olx: "OLX",
  whatsapp: "WhatsApp",
  referral: "Tavsiya",
  walk_in: "Ofisga kelgan",
  other: "Boshqa",
  unknown: "Noma'lum",
};

export const CALL_SOURCE_TYPE: Record<string, string> = {
  call: "Qo'ng'iroq",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

export const CALL_SENTIMENT_COLOR: Record<string, string> = {
  positive: "bg-success/15 text-success",
  neutral: "bg-muted text-muted-foreground",
  negative: "bg-destructive/15 text-destructive",
};

export const COUNTRY_OPTIONS = [
  "O'zbekiston",
  "Qozog'iston",
  "Rossiya",
  "AQSH",
  "Turkiya",
  "BAA",
  "Germaniya",
  "Janubiy Koreya",
  "Xitoy",
  "Boshqa",
];

export const CAR_COLOR_OPTIONS = [
  "Oq",
  "Qora",
  "Kumush",
  "Kulrang",
  "Ko'k",
  "Qizil",
  "Yashil",
  "Jigarrang",
  "Sariq",
  "Boshqa",
];

export const CAR_MAKE_OPTIONS = [
  "Toyota",
  "Chevrolet",
  "Hyundai",
  "Kia",
  "Mercedes-Benz",
  "BMW",
  "Lexus",
  "BYD",
  "Changan",
  "Haval",
  "Nissan",
  "Honda",
  "Volkswagen",
  "Boshqa",
];

export const LEAD_STAGES = ["NEW", "ACTIVE", "CLOSED"] as const;

export const LEAD_STAGE_COLOR: Record<string, string> = {
  NEW: "border-t-blue-500",
  CONTACTED: "border-t-indigo-500",
  NEGOTIATION: "border-t-amber-500",
  CONTRACT: "border-t-purple-500",
  WON: "border-t-emerald-500",
  LOST: "border-t-rose-500",
};

export const PAYMENT_TYPE: Record<string, string> = {
  CASH: "Naqd",
  CREDIT: "Kredit",
  INSTALLMENT: "Bo'lib to'lash",
  TRADEIN: "Trade-in",
};

export const DEAL_STATUS: Record<string, string> = {
  ACTIVE: "Amaldagi",
  COMPLETED: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

export const CONTRACT_STATUS: Record<string, string> = {
  ACTIVE: "Amaldagi",
  COMPLETED: "Yakunlangan",
  CANCELLED: "Bekor qilingan",
};

export const PAYMENT_STATUS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  PAID: "To'langan",
  OVERDUE: "Muddati o'tgan",
};

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  PAID: "bg-success/15 text-success",
  OVERDUE: "bg-destructive/15 text-destructive",
};

export const EXPENSE_CATEGORY: Record<string, string> = {
  RENT: "Ijara",
  SALARY: "Ish haqi",
  MARKETING: "Marketing",
  LOGISTICS: "Logistika",
  OTHER: "Boshqa",
};

export const COMMISSION_STATUS: Record<string, string> = {
  PENDING: "Kutilmoqda",
  PAID: "To'langan",
};

export const CAR_MAKES = [
  "Chevrolet",
  "Toyota",
  "Kia",
  "Hyundai",
  "BYD",
  "Volkswagen",
  "BMW",
  "Mercedes-Benz",
  "Lexus",
  "Nissan",
  "Honda",
  "Zeekr",
  "Li Auto",
];
