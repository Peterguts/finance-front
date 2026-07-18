"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  PiggyBank,
  Landmark,
  Coins,
} from "lucide-react";
import { cn, convertUsdToGtq, formatCurrency, formatPercentage } from "@/lib/utils";

interface PortfolioSummaryProps {
  totalInvested: number;
  currentValue: number;
  totalPnl: number;
  pnlPercentage: number;
  totalRealizedPnl?: number;
  totalUnrealizedPnl?: number;
  totalDeposited?: number;
  totalSpentOnBuys?: number;
  totalReceivedFromSales?: number;
  estimatedCash?: number;
  estimatedCashBeforeAdjustment?: number;
  cashAdjustmentUsd?: number;
  estimatedNetWorth?: number;
}

export function PortfolioSummary({
  totalInvested,
  currentValue,
  totalPnl,
  pnlPercentage,
  totalRealizedPnl,
  totalUnrealizedPnl,
  totalDeposited,
  totalSpentOnBuys,
  totalReceivedFromSales,
  estimatedCash,
  estimatedCashBeforeAdjustment,
  cashAdjustmentUsd,
  estimatedNetWorth,
}: PortfolioSummaryProps) {
  const isPositive = totalPnl >= 0;
  const hasBreakdown = totalRealizedPnl != null && totalUnrealizedPnl != null;
  const hasFunding =
    totalDeposited != null &&
    estimatedCash != null &&
    estimatedNetWorth != null &&
    totalSpentOnBuys != null &&
    totalReceivedFromSales != null;

  const totalInvestedGtq = convertUsdToGtq(totalInvested);
  const currentValueGtq = convertUsdToGtq(currentValue);
  const totalPnlGtq = convertUsdToGtq(totalPnl);

  return (
    <div className="space-y-4">
      {/* Héroe: valor actual del portafolio */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 lg:col-span-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Valor actual · USD
          </p>
          <p className="hero-glow font-display mt-3 text-5xl leading-none tracking-tight text-card-foreground sm:text-6xl">
            {formatCurrency(currentValue, "USD")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                isPositive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
              )}
            >
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? "+" : "-"}
              {formatCurrency(Math.abs(totalPnl), "USD")} · {formatPercentage(pnlPercentage)}
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {formatCurrency(currentValueGtq, "GTQ")}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <SummaryCard
            title="Total invertido"
            value={formatCurrency(totalInvested, "USD")}
            secondary={formatCurrency(totalInvestedGtq, "GTQ")}
            icon={<Wallet className="h-4 w-4" />}
          />
          <SummaryCard
            title="Rendimiento"
            value={formatPercentage(pnlPercentage)}
            secondary="vs capital total"
            icon={<BarChart3 className="h-4 w-4" />}
            tone={pnlPercentage >= 0 ? "success" : "destructive"}
          />
        </div>
      </div>

      {hasBreakdown && (totalRealizedPnl !== 0 || totalUnrealizedPnl !== 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard
            title="G/P realizado (ventas)"
            value={`${totalRealizedPnl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totalRealizedPnl), "USD")}`}
            secondary={formatCurrency(Math.abs(convertUsdToGtq(totalRealizedPnl)), "GTQ")}
            icon={totalRealizedPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            tone={totalRealizedPnl >= 0 ? "success" : "destructive"}
          />
          <SummaryCard
            title="G/P no realizado (posición)"
            value={`${totalUnrealizedPnl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totalUnrealizedPnl), "USD")}`}
            secondary={formatCurrency(Math.abs(convertUsdToGtq(totalUnrealizedPnl)), "GTQ")}
            icon={totalUnrealizedPnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            tone={totalUnrealizedPnl >= 0 ? "success" : "destructive"}
          />
        </div>
      )}

      {hasFunding && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground">Depósitos y saldo</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Total depositado"
              value={formatCurrency(totalDeposited, "USD")}
              secondary={formatCurrency(convertUsdToGtq(totalDeposited), "GTQ")}
              icon={<PiggyBank className="h-4 w-4" />}
            />
            <SummaryCard
              title="Efectivo estimado"
              value={formatCurrency(estimatedCash, "USD")}
              secondary={formatCurrency(convertUsdToGtq(estimatedCash), "GTQ")}
              icon={<Coins className="h-4 w-4" />}
              tone={estimatedCash >= 0 ? "default" : "destructive"}
            />
            <SummaryCard
              title="Patrimonio estimado"
              value={formatCurrency(estimatedNetWorth, "USD")}
              secondary={formatCurrency(convertUsdToGtq(estimatedNetWorth), "GTQ")}
              icon={<Landmark className="h-4 w-4" />}
            />
            <SummaryCard
              title="Compras / ventas (flujo)"
              value={formatCurrency(totalSpentOnBuys, "USD")}
              secondary={`Ventas +${formatCurrency(totalReceivedFromSales, "USD")} · ${formatCurrency(convertUsdToGtq(totalReceivedFromSales), "GTQ")}`}
              icon={<Wallet className="h-4 w-4" />}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Efectivo (fórmula) = depósitos − compras + ingresos brutos por ventas. Si hay{" "}
            <span className="font-medium text-foreground">ajuste de efectivo</span>, se suma al resultado
            para alinear con tu saldo real (comisiones, redondeos). Patrimonio estimado = efectivo mostrado +
            valor de mercado de las posiciones abiertas.
          </p>
          {cashAdjustmentUsd != null &&
            cashAdjustmentUsd !== 0 &&
            estimatedCashBeforeAdjustment != null && (
              <p className="text-xs text-muted-foreground">
                Efectivo por fórmula: {formatCurrency(estimatedCashBeforeAdjustment, "USD")} ·{" "}
                {formatCurrency(convertUsdToGtq(estimatedCashBeforeAdjustment), "GTQ")}
                {" · "}
                Ajuste: {cashAdjustmentUsd > 0 ? "+" : ""}
                {formatCurrency(cashAdjustmentUsd, "USD")}
              </p>
            )}
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  secondary?: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "destructive";
}

function SummaryCard({ title, value, secondary, icon, tone = "default" }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="font-mono text-[11px] uppercase tracking-[0.15em]">{title}</p>
      </div>
      <p
        className={cn(
          "mt-2 font-mono text-2xl font-bold tracking-tight tabular-nums",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
          tone === "default" && "text-card-foreground"
        )}
      >
        {value}
      </p>
      {secondary && (
        <p className="mt-0.5 font-mono text-xs text-muted-foreground tabular-nums">{secondary}</p>
      )}
    </div>
  );
}
