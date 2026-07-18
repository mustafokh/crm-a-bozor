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

/** Kanal ranglari — yuqori kontrast, qattiq fon */
export const CHANNEL_COLOR: Record<string, {
  line: string;
  badge: string;
  tab: string;
  tabActive: string;
  row: string;
}> = {
  CALL: {
    line: "border-l-[6px] border-l-blue-700",
    badge: "bg-blue-700 text-white border border-blue-800 shadow-sm font-semibold",
    tab: "border-2 border-blue-700 text-blue-800 hover:bg-blue-50 font-semibold",
    tabActive: "bg-blue-700 text-white border-2 border-blue-900 shadow-md font-semibold",
    row: "bg-blue-50",
  },
  WHATSAPP: {
    line: "border-l-[6px] border-l-green-600",
    badge: "bg-green-600 text-white border border-green-700 shadow-sm font-semibold",
    tab: "border-2 border-green-600 text-green-800 hover:bg-green-50 font-semibold",
    tabActive: "bg-green-600 text-white border-2 border-green-800 shadow-md font-semibold",
    row: "bg-green-50",
  },
  TELEGRAM: {
    line: "border-l-[6px] border-l-[#229ED9]",
    badge: "bg-[#229ED9] text-white border border-[#1a7fad] shadow-sm font-semibold",
    tab: "border-2 border-[#229ED9] text-[#1579a8] hover:bg-sky-50 font-semibold",
    tabActive: "bg-[#229ED9] text-white border-2 border-[#1579a8] shadow-md font-semibold",
    row: "bg-sky-50",
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
  UNCLEAR: "Aniqlanmadi",
};

export const LEAD_OUTCOMES = Object.keys(LEAD_OUTCOME);

export const LEAD_OUTCOME_COLOR: Record<string, string> = {
  THINKING: "bg-slate-700 text-white",
  CALLBACK: "bg-blue-700 text-white",
  NO_ANSWER: "bg-amber-500 text-white",
  NEGOTIATION: "bg-indigo-600 text-white",
  AGREED: "bg-teal-600 text-white",
  REJECTED: "bg-red-600 text-white",
  BOUGHT: "bg-emerald-600 text-white",
  NOT_INTERESTED: "bg-rose-600 text-white",
  UNCLEAR: "bg-zinc-500 text-white",
};

export const CALL_OUTCOME: Record<string, string> = {
  purchased: "Sotib oldi",
  not_purchased: "Sotib olmadi",
  pending: "Kutilmoqda",
  callback_needed: "Qayta qo'ng'iroq",
  unclear: "Aniqlanmadi",
};

export const CALL_OUTCOMES = Object.keys(CALL_OUTCOME);

export const CALL_OUTCOME_COLOR: Record<string, string> = {
  purchased: "bg-emerald-600 text-white",
  not_purchased: "bg-red-600 text-white",
  pending: "bg-amber-500 text-white",
  callback_needed: "bg-blue-700 text-white",
  unclear: "bg-zinc-500 text-white",
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
