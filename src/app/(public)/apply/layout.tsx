import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MKUS — Onlayn ariza",
  description: "MKUS avtosalon — mashina sotib olish uchun onlayn ariza",
};

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
