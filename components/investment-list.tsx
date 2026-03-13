"use client";

import { useState } from "react";
import { Trash2, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import type { Investment } from "@/lib/types";
import {
  cn,
  convertUsdToGtq,
  formatCurrency,
  formatNumber,
  formatPercentage,
} from "@/lib/utils";
import { deleteInvestment } from "@/lib/api";

interface InvestmentListProps {
  investments: Investment[];
  prices: Record<string, number>;
  onDelete: () => void;
}

export function InvestmentList({ investments, prices, onDelete }: InvestmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteInvestment(id);
      onDelete();
    } catch (error) {
      console.error("Failed to delete investment:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (investments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Aún no hay inversiones. Añade la primera arriba.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Activo</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Cantidad</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Precio compra</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Precio actual</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Valor</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">G/P</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {investments.map((investment) => {
              const currentPrice = prices[investment.ticker] || investment.buy_price;
              const investedValueUsd = investment.amount * investment.buy_price;
              const currentValueUsd = investment.amount * currentPrice;
              const pnlUsd = currentValueUsd - investedValueUsd;
              const pnlPercent = (pnlUsd / investedValueUsd) * 100;
              const isPositive = pnlUsd >= 0;

              const currentValueGtq = convertUsdToGtq(currentValueUsd);
              const pnlGtq = convertUsdToGtq(pnlUsd);

              return (
                <tr
                  key={investment.id}
                  className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                          isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {investment.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{investment.ticker}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(investment.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                    {formatNumber(investment.amount)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                    {formatCurrency(investment.buy_price, "USD")}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                    {formatCurrency(currentPrice, "USD")}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground">
                    <div>{formatCurrency(currentValueUsd, "USD")}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(currentValueGtq, "GTQ")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div
                      className={cn(
                        "flex items-center justify-end gap-1",
                        isPositive ? "text-success" : "text-destructive"
                      )}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="font-mono text-sm font-medium">
                        {formatPercentage(pnlPercent)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "font-mono text-xs",
                        isPositive ? "text-success/70" : "text-destructive/70"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(pnlUsd, "USD")}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {isPositive ? "+" : ""}
                      {formatCurrency(pnlGtq, "GTQ")}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(investment.id)}
                      disabled={deletingId === investment.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label={`Eliminar ${investment.ticker}`}
                    >
                      {deletingId === investment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
