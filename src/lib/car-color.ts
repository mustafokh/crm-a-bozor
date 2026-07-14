/** Avtomobil ranglari — sticker hex + inglizcha nom */

export interface CarColorInfo {
  key: string;
  /** UI’da ko‘rinadigan asosiy nom (inglizcha) */
  labelEn: string;
  /** O‘zbekcha / mahalliy nom */
  labelLocal: string;
  hex: string;
  /** Oq/sariq kabi och ranglar uchun chegarа */
  border?: boolean;
}

const COLORS: CarColorInfo[] = [
  { key: "qora", labelEn: "Black", labelLocal: "Qora", hex: "#111111" },
  { key: "oq", labelEn: "White", labelLocal: "Oq", hex: "#F5F5F5", border: true },
  { key: "kumush", labelEn: "Silver", labelLocal: "Kumush", hex: "#C0C0C0", border: true },
  { key: "kulrang", labelEn: "Gray", labelLocal: "Kulrang", hex: "#6B7280" },
  { key: "kok", labelEn: "Blue", labelLocal: "Ko'k", hex: "#2563EB" },
  { key: "qizil", labelEn: "Red", labelLocal: "Qizil", hex: "#DC2626" },
  { key: "yashil", labelEn: "Green", labelLocal: "Yashil", hex: "#16A34A" },
  { key: "jigarrang", labelEn: "Brown", labelLocal: "Jigarrang", hex: "#92400E" },
  { key: "sariq", labelEn: "Yellow", labelLocal: "Sariq", hex: "#EAB308", border: true },
  { key: "binafsha", labelEn: "Purple", labelLocal: "Binafsha", hex: "#7C3AED" },
  { key: "orange", labelEn: "Orange", labelLocal: "To'q sariq", hex: "#EA580C" },
  { key: "bej", labelEn: "Beige", labelLocal: "Bej", hex: "#D4C4A8", border: true },
  { key: "gold", labelEn: "Gold", labelLocal: "Oltin", hex: "#D4A017", border: true },
];

const ALIASES: Record<string, string> = {
  black: "qora",
  qora: "qora",
  "qora ": "qora",
  white: "oq",
  oq: "oq",
  silver: "kumush",
  kumush: "kumush",
  grey: "kulrang",
  gray: "kulrang",
  kulrang: "kulrang",
  blue: "kok",
  "ko'k": "kok",
  "ko`k": "kok",
  kok: "kok",
  red: "qizil",
  qizil: "qizil",
  green: "yashil",
  yashil: "yashil",
  brown: "jigarrang",
  jigarrang: "jigarrang",
  yellow: "sariq",
  sariq: "sariq",
  purple: "binafsha",
  binafsha: "binafsha",
  orange: "orange",
  "to'q sariq": "orange",
  beige: "bej",
  bej: "bej",
  gold: "gold",
  oltin: "gold",
  boshqa: "boshqa",
  other: "boshqa",
};

function normalize(raw: string) {
  return raw.trim().toLowerCase().replace(/ё/g, "e");
}

export function resolveCarColor(raw?: string | null): CarColorInfo | null {
  if (!raw?.trim()) return null;
  const n = normalize(raw);
  const key = ALIASES[n];
  if (key && key !== "boshqa") {
    return COLORS.find((c) => c.key === key) ?? null;
  }
  // Qisman match: "Qora Malibu" emas, faqat rang
  for (const c of COLORS) {
    if (n.includes(c.labelLocal.toLowerCase()) || n.includes(c.labelEn.toLowerCase()) || n === c.key) {
      return c;
    }
  }
  return {
    key: "custom",
    labelEn: raw.trim(),
    labelLocal: raw.trim(),
    hex: "#64748B",
    border: true,
  };
}
