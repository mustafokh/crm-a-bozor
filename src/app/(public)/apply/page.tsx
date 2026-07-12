"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { PublicShell } from "@/components/public/public-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/language-provider";
import { TalkFields, emptyTalkForm } from "@/components/leads/talk-fields";
import { COUNTRY_OPTIONS } from "@/lib/constants";

function ApplyForm() {
  const params = useSearchParams();
  const sourceParam = params.get("source");
  const { t } = useI18n();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    country: "",
    message: "",
  });
  const [talkForm, setTalkForm] = useState(emptyTalkForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const source =
      sourceParam === "instagram"
        ? "INSTAGRAM"
        : sourceParam === "telegram"
          ? "TELEGRAM"
          : "WEBSITE";

    const res = await fetch("/api/public/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...talkForm, source }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (data.fields) setErrors(data.fields);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h2 className="mt-4 font-display text-xl font-bold">{t("public.apply.successTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("public.apply.successDesc")}</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card className="p-6 shadow-soft">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">{t("public.apply.fullName")} *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ali Valiyev"
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>}
          </div>
          <div>
            <Label htmlFor="phone">{t("public.apply.phone")} *</Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+998 90 123 45 67"
              className={errors.phone ? "border-destructive" : ""}
            />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div>
            <Label>{t("leads.col.country")}</Label>
            <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              <option value="">{t("common.select")}</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>

          <TalkFields value={talkForm} onChange={setTalkForm} showOutcome={false} />

          <div>
            <Label>{t("public.apply.message")}</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder={t("public.apply.messagePlaceholder")}
              rows={3}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" /> {t("public.apply.submit")}
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function ApplyPage() {
  const { t } = useI18n();
  return (
    <PublicShell active="apply">
      <section className="relative border-b border-border/50 bg-gradient-to-br from-card via-card to-brand-red/[0.04] py-12 sm:py-16">
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-brand-red/[0.08] blur-3xl" />
        <div className="relative mx-auto max-w-lg px-4 text-center sm:px-6">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t("public.apply.title")}
          </h1>
          <p className="mt-3 text-muted-foreground">{t("public.apply.subtitle")}</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ApplyForm />
        </Suspense>
        <p className="mx-auto mt-8 max-w-md text-center text-xs text-muted-foreground">
          {t("public.apply.privacy")}
        </p>
      </div>
    </PublicShell>
  );
}
