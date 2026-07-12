import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

/** Company settings change rarely — cache 5 minutes. */
export const getCachedCompany = unstable_cache(
  async () => prisma.companySetting.findUnique({ where: { id: "company" } }),
  ["company-setting"],
  { revalidate: 300 }
);

/** Overdue follow-up badge — refresh every 30 seconds. */
export const getCachedOverdueCount = unstable_cache(
  async () =>
    prisma.lead.count({
      where: {
        followUpAt: { lte: new Date() },
        status: { notIn: ["WON", "LOST"] },
      },
    }),
  ["overdue-followups"],
  { revalidate: 30 }
);
