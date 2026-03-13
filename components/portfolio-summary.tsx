"use client";

import { TrendingUp, TrendingDown, Wallet, DollarSign, BarChart3 } from "lucide-react";
import { cn, convertUsdToGtq, formatCurrency, formatPercentage } from "@/lib/utils";

interface PortfolioSummaryProps {
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  pnlPercentage: number;
}

export function PortfolioSummary({
  totalInvested,
  currentValue,
  totalPnl,
  pnlPercentage,
}: PortfolioSummaryProps) {
  const isPositive = totalPnl >= 0;

  const totalInvestedGtq = convertUsdToGtq(totalInvested);
  const currentValueGtq = convertUsdToGtq(currentValue);
  const totalPnlGtq = convertUsdToGtq(totalPnl);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        title="Total invertido"
        value={formatCurrency(totalInvested, "USD")}
        secondary={formatCurrency(totalInvestedGtq, "GTQ")}
        icon={<Wallet className="h-5 w-5" />}
        variant="default"
      />
      <SummaryCard
        title="Valor actual"
        value={formatCurrency(currentValue, "USD")}
        secondary={formatCurrency(currentValueGtq, "GTQ")}
        icon={<DollarSign className="h-5 w-5" />}
        variant="default"
      />
      <SummaryCard
        title="Ganancia / Pérdida"
        value={formatCurrency(Math.abs(totalPnl), "USD")}
        secondary={formatCurrency(Math.abs(totalPnlGtq), "GTQ")}
        prefix={totalPnl >= 0 ? "+" : "-"}
        icon={isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        variant={isPositive ? "success" : "destructive"}
      />
      <SummaryCard
        title="Rendimiento"
        value={formatPercentage(pnlPercentage)}
        secondary="vs capital total"
        icon={<BarChart3 className="h-5 w-5" />}
        variant={pnlPercentage >= 0 ? "success" : "destructive"}
      />
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  secondary?: string;
  prefix?: string;
  icon: React.ReactNode;
  variant: "default" | "success" | "destructive";
}

function SummaryCard({ title, value, secondary, prefix, icon, variant }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full [&_svg]:shrink-0",
            variant === "success" && "bg-success/15 text-success",
            variant === "destructive" && "bg-destructive/15 text-destructive",
            variant === "default" && "bg-muted text-card-foreground"
          )}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p
          className={cn(
            "text-2xl font-bold tracking-tight",
            variant === "success" && "text-success",
            variant === "destructive" && "text-destructive",
            variant === "default" && "text-card-foreground"
          )}
        >
          {prefix}
          {value}
        </p>
        {secondary && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}
