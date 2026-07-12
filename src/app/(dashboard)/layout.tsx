import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { permissionsFor } from "@/lib/rbac";
import { getCachedCompany, getCachedOverdueCount } from "@/lib/server-cache";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const permissions = permissionsFor(session.role);

  const [company, notifications] = await Promise.all([
    getCachedCompany(),
    getCachedOverdueCount(),
  ]);

  return (
    <AppShell
      user={session}
      permissions={permissions}
      companyName={company?.name ?? "MKUS"}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
