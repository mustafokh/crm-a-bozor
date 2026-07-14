import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { HomeFeatureGrid } from "@/components/dashboard/home-feature-grid";
import { HomeAnalyticsSection } from "@/components/dashboard/home-analytics-section";
import { HomeRecentLeads } from "@/components/dashboard/home-recent-leads";
import { leadDashboardStats } from "@/lib/lead-stats";
import { getServerT } from "@/lib/i18n/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  const { t } = await getServerT();
  const stats = await leadDashboardStats(session?.id, session?.role);

  const firstName = session?.name.split(" ")[0] ?? "";
  const isAdmin = session?.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title={t("dashboard.greeting", { name: firstName })}
        description={t("home.subtitle")}
        action={
          <Link href="/leads?new=1">
            <Button>
              <Plus className="h-4 w-4" /> {t("leads.add")}
            </Button>
          </Link>
        }
      />

      <HomeFeatureGrid stats={stats} isAdmin={isAdmin} />

      <HomeAnalyticsSection stats={stats} />

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("home.recentLeads")}</h2>
          <Link href="/leads" className="text-sm text-primary hover:underline">
            {t("home.viewAllLeads")}
          </Link>
        </div>
        <HomeRecentLeads leads={stats.recentLeads} />
      </div>
    </div>
  );
}
