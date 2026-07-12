"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Link2 } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function CopyRow({ label, path }: { label: string; path: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{url}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? (
            <><Check className="h-3.5 w-3.5 text-success" /> {t("public.links.copied")}</>
          ) : (
            <><Copy className="h-3.5 w-3.5" /> {t("public.links.copy")}</>
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => window.open(url, "_blank")}>
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function PublicLinksCard() {
  const { t } = useI18n();

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-brand-blue" />
        <h3 className="text-sm font-semibold">{t("public.links.title")}</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{t("public.links.hint")}</p>
      <div className="space-y-2">
        <CopyRow label={t("public.links.apply")} path="/apply" />
      </div>
    </Card>
  );
}
