"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { ToastProvider } from "@/components/ui/toast";
import type { Permission } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";

export function AppShell({
  user,
  permissions,
  companyName,
  notifications,
  children,
}: {
  user: SessionUser;
  permissions: Permission[];
  companyName: string;
  notifications: number;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          permissions={permissions}
          companyName={companyName}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar
            user={user}
            notifications={notifications}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto scrollbar-thin bg-background p-4 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
