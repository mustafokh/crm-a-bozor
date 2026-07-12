"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { BrandLogo, MkusWordmark } from "@/components/brand-logo";
import { useI18n } from "@/components/language-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { safeRedirectPath } from "@/lib/security/safe-redirect";

const isProd = process.env.NODE_ENV === "production";

const DEMO_ACCOUNTS = [
  { labelKey: "enum.role.ADMIN", email: "admin@abozor.uz" },
  { labelKey: "enum.role.MANAGER", email: "manager@abozor.uz" },
  { labelKey: "enum.role.ACCOUNTANT", email: "buxgalter@abozor.uz" },
  { labelKey: "enum.role.WAREHOUSE", email: "ombor@abozor.uz" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const [email, setEmail] = useState(isProd ? "" : "admin@abozor.uz");
  const [password, setPassword] = useState(isProd ? "" : "admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.error"));
        setLoading(false);
        return;
      }
      const from = safeRedirectPath(params.get("from"));
      router.push(from);
      router.refresh();
    } catch {
      setError(t("login.serverError"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-card p-12 lg:flex">
        <div className="grad-sweep absolute inset-0 opacity-[0.04]" />
        <div className="relative">
          <BrandLogo size="lg" href={false} />
        </div>
        <div className="relative">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
            {t("login.heroLine1")}{" "}
            <span className="text-grad-warm">{t("login.heroHighlight")}</span>
            {t("login.heroLine2") ? ` ${t("login.heroLine2")}` : ""}
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">{t("login.heroDesc")}</p>
          <div className="mt-8 flex gap-3">
            <div className="rounded-2xl bg-brand-red/10 px-4 py-3">
              <p className="text-2xl font-bold text-brand-red">CRM</p>
              <p className="text-xs text-muted-foreground">{t("login.crmBadge")}</p>
            </div>
            <div className="rounded-2xl bg-brand-blue/10 px-4 py-3">
              <p className="text-2xl font-bold text-brand-blue">24/7</p>
              <p className="text-xs text-muted-foreground">{t("login.realtimeBadge")}</p>
            </div>
          </div>
        </div>
        <p className="relative text-sm text-muted-foreground">© {new Date().getFullYear()} MKUS</p>
      </div>

      <div className="relative flex w-full items-center justify-center bg-background p-6 lg:w-1/2">
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandLogo size="md" href={false} />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">{t("login.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <MkusWordmark size="sm" className="inline" /> {t("login.subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.uz"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="rounded-2xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full grad-dark border-0" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {t("login.submit")}
            </Button>
          </form>

          {!isProd && (
          <div className="mt-8 rounded-3xl bg-card p-5 shadow-soft">
            <p className="text-xs font-medium text-muted-foreground">{t("login.demoTitle")}</p>
            <div className="mt-2 grid grid-cols-1 gap-1">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword("admin123");
                  }}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                >
                  <span className="font-medium">{t(a.labelKey)}</span>
                  <span className="text-muted-foreground">{a.email}</span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">...</div>}>
      <LoginForm />
    </Suspense>
  );
}
