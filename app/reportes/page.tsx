"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Loader2, Filter, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { fetchMovements, fetchPortfolioSummary } from "@/lib/api";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

function getDefaultFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

function getDefaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportesPage() {
  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [tickerFilter, setTickerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");

  const { data: portfolio } = useSWR("portfolio", fetchPortfolioSummary, { refreshInterval: 30000 });
  const tickers = useMemo(() => {
    const fromPos = portfolio?.positions?.map((p) => p.ticker) ?? [];
    const fromInv = portfolio?.investments?.map((i) => i.ticker) ?? [];
    return [...new Set([...fromPos, ...fromInv])].filter(Boolean).sort();
  }, [portfolio]);

  const params = useMemo(
    () => ({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      ticker: tickerFilter.trim() || undefined,
      type: typeFilter === "all" ? undefined : typeFilter,
      limit: 500,
    }),
    [fromDate, toDate, tickerFilter, typeFilter]
  );

  const { data: movements, error, isLoading, mutate } = useSWR(
    ["movements", params.from_date, params.to_date, params.ticker, params.type],
    () => fetchMovements(params),
    { refreshInterval: 60000 }
  );

  const handleRefresh = () => {
    mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader onRefresh={handleRefresh} isRefreshing={isLoading} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Reportes e historial</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Consulta todos tus movimientos (compras y ventas) con filtros por fecha y activo.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="report-from" className="mb-1 block text-xs font-medium text-muted-foreground">
                Desde
              </label>
              <input
                id="report-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1 block text-xs font-medium text-muted-foreground">
                Hasta
              </label>
              <input
                id="report-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label htmlFor="report-ticker" className="mb-1 block text-xs font-medium text-muted-foreground">
                Activo
              </label>
              <select
                id="report-ticker"
                value={tickerFilter}
                onChange={(e) => setTickerFilter(e.target.value)}
                className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Todos</option>
                {tickers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="report-type" className="mb-1 block text-xs font-medium text-muted-foreground">
                Tipo
              </label>
              <select
                id="report-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "buy" | "sell")}
                className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">Todos</option>
                <option value="buy">Compras</option>
                <option value="sell">Ventas</option>
              </select>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error al cargar movimientos"}
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
            >
              Reintentar
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Activo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      G/P realizado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movements?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No hay movimientos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    movements?.map((m) => (
                      <tr
                        key={`${m.type}-${m.id}`}
                        className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                          {m.date ? new Date(m.date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                              m.type === "buy"
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {m.type === "buy" ? (
                              <ArrowDownCircle className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                            )}
                            {m.type === "buy" ? "Compra" : "Venta"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{m.ticker}</td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatNumber(m.quantity)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm">
                          {formatCurrency(m.price, "USD")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                          {formatCurrency(m.amount, "USD")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {m.realized_pnl != null ? (
                            <span
                              className={cn(
                                "font-mono text-sm font-medium",
                                m.realized_pnl >= 0 ? "text-success" : "text-destructive"
                              )}
                            >
                              {m.realized_pnl >= 0 ? "+" : ""}
                              {formatCurrency(m.realized_pnl, "USD")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
