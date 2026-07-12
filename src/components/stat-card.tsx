import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  trend,
  accent = "primary",
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: number; positive: boolean };
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const accents = {
    primary: "bg-brand-blue/10 text-brand-blue",
    success: "bg-success/10 text-success",
    warning: "bg-brand-red/10 text-brand-red",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className="fade-up chrome-surface p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="tnum mt-2 truncate font-display text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend.positive ? (
            <TrendingUp className="h-3.5 w-3.5 text-success" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className={trend.positive ? "text-success" : "text-destructive"}>
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-muted-foreground">o'tgan oyga nisbatan</span>
        </div>
      )}
    </Card>
  );
}
