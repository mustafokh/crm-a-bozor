import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MKUS Showroom — Mashinalar katalogi",
  description: "MKUS avtosalon — ombordagi mashinalar, narxlar va to'liq ma'lumotlar",
};

export default function ShowroomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
