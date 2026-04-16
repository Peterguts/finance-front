"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useEffect } from "react";
import { Loader2, AlertTriangle, Filter, ArrowDownCircle, ArrowUpCircle, ArrowUp } from "lucide-react";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { PortfolioAllocationChart } from "@/components/portfolio-allocation-chart";
import { AppHeader } from "@/components/app-header";
import { AddInvestmentForm } from "@/components/add-investment-form";
import { InvestmentList } from "@/components/investment-list";
import {
  fetchUsdGtqRate,
  fetchDeposits,
  fetchMovements,
  fetchPortfolioSummary,
  fetchPricesForTickers,
  fetchPricesStatus,
} from "@/lib/api";
import {
  cn,
  convertUsdToGtq,
  formatCurrency,
  formatNumber,
  normalizeTicker,
  setUsdToGtqRate,
} from "@/lib/utils";
import type { Investment, PortfolioPosition } from "@/lib/types";

function getDefaultFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

function getDefaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const {
    data: portfolio,
    error: portfolioError,
    isLoading: portfolioLoading,
    mutate: mutatePortfolio,
  } = useSWR("portfolio", fetchPortfolioSummary, { refreshInterval: 30000 });

  const tickers = portfolio?.investments?.map((i) => i.ticker).filter(Boolean) ?? [];
  const tickerKey =
    tickers.length > 0 ? ["prices", [...new Set(tickers)].sort().join(",")] : null;
  const {
    data: prices,
    isLoading: pricesLoading,
    mutate: mutatePrices,
  } = useSWR(
    tickerKey,
    ([, tickerStr]: [string, string]) =>
      fetchPricesForTickers(tickerStr ? tickerStr.split(",") : []),
    { refreshInterval: 30000 }
  );

  const { data: pricesStatus } = useSWR("prices-status", fetchPricesStatus, {
    refreshInterval: 60000,
  });
  const { data: fxRate } = useSWR("fx-usd-gtq", fetchUsdGtqRate, { refreshInterval: 300000 });

  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [tickerFilter, setTickerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");

  const positionsByTicker: Record<string, PortfolioPosition> =
    (portfolio?.positions ?? []).reduce((acc, pos) => {
      acc[pos.ticker] = pos;
      return acc;
    }, {} as Record<string, PortfolioPosition>);

  const investmentsForTable: Investment[] = useMemo(() => {
    const open = new Set(
      (portfolio?.positions ?? [])
        .filter((p) => p.quantity > 0)
        .map((p) => normalizeTicker(p.ticker))
    );
    return (portfolio?.investments ?? []).filter((inv) =>
      open.has(normalizeTicker(inv.ticker))
    );
  }, [portfolio]);

  const tickersForReports = useMemo(() => {
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

  const {
    data: movements,
    error: movementsError,
    isLoading: movementsLoading,
    mutate: mutateMovements,
  } = useSWR(
    ["movements", params.from_date, params.to_date, params.ticker, params.type],
    () => fetchMovements(params),
    { refreshInterval: 60000 }
  );
  const { data: deposits, isLoading: depositsLoading, error: depositsError } = useSWR(
    "deposits",
    fetchDeposits,
    { refreshInterval: 60000 }
  );

  const isLoading = portfolioLoading || pricesLoading;
  const error = portfolioError;

  const handleRefresh = () => {
    mutatePortfolio(undefined, { revalidate: true });
    mutatePrices(undefined, { revalidate: true });
    mutateMovements(undefined, { revalidate: true });
  };

  const pricesMap = prices ?? {};

  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 420);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (fxRate?.rate) {
      setUsdToGtqRate(fxRate.rate);
    }
  }, [fxRate?.rate]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        onRefresh={handleRefresh}
        isRefreshing={portfolioLoading || pricesLoading}
        fxRateLabel={fxRate?.rate ? formatNumber(fxRate.rate, 4) : undefined}
      />
      

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-12">
        {error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error al cargar el portafolio"}
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
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">Cargando portafolio…</p>
            </div>
          </div>
        ) : portfolio ? (
          <div className="space-y-12">
            {pricesStatus && !pricesStatus.live && (
              <div
                className="flex items-center gap-3 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3 text-warning-foreground"
                role="alert"
              >
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">
                  No se pudieron obtener precios del mercado en tiempo real. Los valores mostrados pueden ser estimados o del último disponible.
                </p>
              </div>
            )}

            <section id="resumen" className="mb-2 scroll-mt-24">
              <h2 className="text-base font-bold text-foreground mb-3">Dashboard</h2>
              <PortfolioSummary
                totalInvested={portfolio.total_invested}
                currentValue={portfolio.current_value}
                totalPnl={portfolio.total_pnl}
                pnlPercentage={portfolio.pnl_percentage}
                totalRealizedPnl={portfolio.total_realized_pnl}
                totalUnrealizedPnl={portfolio.total_unrealized_pnl}
                totalDeposited={portfolio.total_deposited}
                totalSpentOnBuys={portfolio.total_spent_on_buys}
                totalReceivedFromSales={portfolio.total_received_from_sales}
                estimatedCash={portfolio.estimated_cash}
                estimatedNetWorth={portfolio.estimated_net_worth}
              />
            </section>

            <section id="depositos-resumen" className="scroll-mt-24">
              <h2 className="text-base font-bold text-foreground mb-1">
                Depósitos recientes
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Últimos fondos ingresados para tu capital de inversión.
              </p>
              {depositsError ? (
                <div className="rounded-xl border border-border bg-card p-6 text-sm text-destructive">
                  No se pudieron cargar los depósitos.
                </div>
              ) : depositsLoading ? (
                <div className="rounded-xl border border-border bg-card p-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Monto
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Comisión
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(deposits ?? []).slice(0, 5).map((d) => (
                          <tr
                            key={d.id}
                            className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{d.date}</td>
                            <td className="px-4 py-3 text-right font-mono text-sm">
                              <div>{formatCurrency(d.amount, "USD")}</div>
                              <div className="text-xs text-muted-foreground">{formatCurrency(convertUsdToGtq(d.amount), "GTQ")}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm">
                              <div>{formatNumber(d.commission_pct, 2)}% · {formatCurrency(d.commission_amount, "USD")}</div>
                              <div className="text-xs text-muted-foreground">{formatCurrency(convertUsdToGtq(d.commission_amount), "GTQ")}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                              <div>{formatCurrency(d.total, "USD")}</div>
                              <div className="text-xs text-muted-foreground">{formatCurrency(convertUsdToGtq(d.total), "GTQ")}</div>
                            </td>
                          </tr>
                        ))}
                        {(deposits ?? []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                              Aún no tienes depósitos registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

            <section id="distribucion" className="scroll-mt-24">
              <h2 className="text-base font-bold text-foreground mb-1">
                Distribución del portafolio
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Cómo se reparte tu capital entre los distintos activos.
              </p>
              <PortfolioAllocationChart
                investments={portfolio.investments}
                prices={pricesMap}
              />
            </section>

            <section id="inversiones" className="scroll-mt-24">
              <h2 className="text-base font-bold text-foreground mb-1">
                Inversiones actuales
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Añade nuevas posiciones o vende directamente desde la tabla. Esta vista muestra solo tus
                activos, las ventas se reflejan en el área de reportes.
              </p>
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <AddInvestmentForm onSuccess={handleRefresh} />
              </div>
              <InvestmentList
                investments={investmentsForTable}
                prices={pricesMap}
                positionsByTicker={positionsByTicker}
                onChange={handleRefresh}
              />
            </section>

            <section id="desglose" className="scroll-mt-24">
              <h2 className="text-base font-bold text-foreground mb-1">
                Ganancias y pérdidas por activo
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Vista resumida por acción (en tarjetas) para evitar duplicar la tabla de inversiones.
              </p>
              {((portfolio.positions ?? []).length > 0) ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(portfolio.positions ?? []).map((pos) => {
                    const hasUnrealized = pos.unrealized_pnl !== 0;
                    const hasRealized = pos.realized_pnl !== 0;
                    const unrealizedPos = pos.unrealized_pnl > 0;
                    const realizedPos = pos.realized_pnl > 0;
                    const hasPosition = pos.quantity > 0;
                    const relatedSells = (movements ?? []).filter(
                      (m) => m.type === "sell" && m.ticker.toUpperCase() === pos.ticker.toUpperCase()
                    );
                    const soldQty = relatedSells.reduce((sum, m) => sum + m.quantity, 0);
                    const avgSellPrice =
                      soldQty > 0
                        ? relatedSells.reduce((sum, m) => sum + m.quantity * m.price, 0) / soldQty
                        : 0;
                    const inferredAvgCost =
                      soldQty > 0
                        ? relatedSells.reduce((sum, m) => {
                            const realized = m.realized_pnl ?? 0;
                            const inferredCost = m.price - realized / m.quantity;
                            return sum + m.quantity * inferredCost;
                          }, 0) / soldQty
                        : 0;

                    const mainPnlValue = hasUnrealized
                      ? pos.unrealized_pnl
                      : hasRealized
                        ? pos.realized_pnl
                        : 0;
                    const mainPnlVariant =
                      mainPnlValue > 0 ? "success" : mainPnlValue < 0 ? "destructive" : "muted";

                    return (
                      <div
                        key={pos.ticker}
                        className="rounded-xl border border-border bg-card p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{pos.ticker}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {hasPosition ? (
                                <>
                                  Posición: <span className="font-mono">{formatNumber(pos.quantity)}</span>
                                </>
                              ) : (
                                "Sin posición abierta"
                              )}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                              mainPnlVariant === "success" && "bg-success/10 text-success",
                              mainPnlVariant === "destructive" && "bg-destructive/10 text-destructive",
                              mainPnlVariant === "muted" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {mainPnlVariant === "muted"
                              ? "Pendiente"
                              : `${mainPnlValue > 0 ? "+" : ""}${formatCurrency(mainPnlValue, "USD")} · ${formatCurrency(Math.abs(convertUsdToGtq(mainPnlValue)), "GTQ")}`}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                              {hasPosition ? "Valor actual" : "Prom. venta"}
                            </p>
                            <p className="mt-1 font-mono text-sm text-foreground">
                              {hasPosition
                                ? `${formatCurrency(pos.current_value, "USD")} · ${formatCurrency(convertUsdToGtq(pos.current_value), "GTQ")}`
                                : soldQty > 0
                                  ? `${formatCurrency(avgSellPrice, "USD")} · ${formatCurrency(convertUsdToGtq(avgSellPrice), "GTQ")}`
                                  : ""}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                              {hasPosition ? "Coste (base)" : "Coste prom."}
                            </p>
                            <p className="mt-1 font-mono text-sm text-foreground">
                              {hasPosition
                                ? `${formatCurrency(pos.cost_basis, "USD")} · ${formatCurrency(convertUsdToGtq(pos.cost_basis), "GTQ")}`
                                : soldQty > 0
                                  ? `${formatCurrency(inferredAvgCost, "USD")} · ${formatCurrency(convertUsdToGtq(inferredAvgCost), "GTQ")}`
                                  : ""}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">G/P no realizado</span>
                            {hasUnrealized ? (
                              <span
                                className={cn(
                                  "font-mono font-medium",
                                  unrealizedPos ? "text-success" : "text-destructive"
                                )}
                              >
                                {pos.unrealized_pnl > 0 ? "+" : ""}
                                {formatCurrency(pos.unrealized_pnl, "USD")} · {formatCurrency(Math.abs(convertUsdToGtq(pos.unrealized_pnl)), "GTQ")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {hasPosition ? "Pendiente" : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">G/P realizado (ventas)</span>
                            {hasRealized ? (
                              <span
                                className={cn(
                                  "font-mono font-medium",
                                  realizedPos ? "text-success" : "text-destructive"
                                )}
                              >
                                {pos.realized_pnl > 0 ? "+" : ""}
                                {formatCurrency(pos.realized_pnl, "USD")} · {formatCurrency(Math.abs(convertUsdToGtq(pos.realized_pnl)), "GTQ")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Pendiente</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aún no hay posiciones. Añade compras en Inversiones para ver el detalle por activo.
                  </p>
                </div>
              )}
            </section>

            <section id="reportes" className="scroll-mt-24 space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">
                  Reportes e historial
                </h2>
                <p className="text-sm text-muted-foreground">
                  Consulta todos tus movimientos (compras y ventas) con filtros por fecha y activo.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label
                      htmlFor="report-from"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
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
                    <label
                      htmlFor="report-to"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
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
                    <label
                      htmlFor="report-ticker"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      Activo
                    </label>
                    <select
                      id="report-ticker"
                      value={tickerFilter}
                      onChange={(e) => setTickerFilter(e.target.value)}
                      className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Todos</option>
                      {tickersForReports.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="report-type"
                      className="mb-1 block text-xs font-medium text-muted-foreground"
                    >
                      Tipo
                    </label>
                    <select
                      id="report-type"
                      value={typeFilter}
                      onChange={(e) =>
                        setTypeFilter(e.target.value as "all" | "buy" | "sell")
                      }
                      className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="all">Todos</option>
                      <option value="buy">Compras</option>
                      <option value="sell">Ventas</option>
                    </select>
                  </div>
                </div>
              </div>

              {movementsError ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center">
                  <p className="text-destructive">
                    {movementsError instanceof Error
                      ? movementsError.message
                      : "Error al cargar movimientos"}
                  </p>
                  <button
                    type="button"
                    onClick={() => mutateMovements()}
                    className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
                  >
                    Reintentar
                  </button>
                </div>
              ) : movementsLoading ? (
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
                            <td
                              colSpan={7}
                              className="px-4 py-12 text-center text-sm text-muted-foreground"
                            >
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
                              <td className="px-4 py-3 font-medium text-foreground">
                                {m.ticker}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                {formatNumber(m.quantity)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                <div>{formatCurrency(m.price, "USD")}</div>
                                <div className="text-xs text-muted-foreground">{formatCurrency(convertUsdToGtq(m.price), "GTQ")}</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                                <div>{formatCurrency(m.amount, "USD")}</div>
                                <div className="text-xs text-muted-foreground">{formatCurrency(convertUsdToGtq(m.amount), "GTQ")}</div>
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
                                    {formatCurrency(m.realized_pnl, "USD")} · {formatCurrency(Math.abs(convertUsdToGtq(m.realized_pnl)), "GTQ")}
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
            </section>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          Precios vía Yahoo / Finnhub · Tipo de cambio GTQ aproximado
        </p>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "fixed bottom-5 right-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full",
            "border border-border bg-card shadow-md transition-colors hover:bg-muted"
          )}
          aria-label="Volver al inicio"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
