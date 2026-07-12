import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MKUS — Onlayn xizmatlar",
  description: "MKUS avtosalon — mashinalar katalogi va onlayn ariza",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
