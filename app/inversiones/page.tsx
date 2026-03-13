"use client";

import useSWR from "swr";
import { Loader2, AlertTriangle } from "lucide-react";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { InvestmentList } from "@/components/investment-list";
import { AddInvestmentForm } from "@/components/add-investment-form";
import { AppHeader } from "@/components/app-header";
import { fetchPortfolioSummary, fetchPrices, fetchPricesStatus } from "@/lib/api";

export default function InversionesPage() {
  const {
    data: portfolio,
    error,
    isLoading,
    mutate: mutatePortfolio,
  } = useSWR("portfolio", fetchPortfolioSummary, { refreshInterval: 30000 });

  const { data: prices, mutate: mutatePrices } = useSWR("prices", fetchPrices, {
    refreshInterval: 30000,
  });

  const { data: pricesStatus } = useSWR("prices-status", fetchPricesStatus, {
    refreshInterval: 60000,
  });

  const handleRefresh = () => {
    mutatePortfolio();
    mutatePrices();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader onRefresh={handleRefresh} isRefreshing={isLoading} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-destructive">
              {error instanceof Error ? error.message : "Error al cargar datos"}
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
              <p className="mt-4 text-sm text-muted-foreground">Cargando…</p>
            </div>
          </div>
        ) : portfolio ? (
          <div className="space-y-10">
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
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">Resumen rápido</h2>
              <PortfolioSummary
                totalInvested={portfolio.total_invested}
                currentValue={portfolio.current_value}
                totalPnl={portfolio.total_pnl}
                pnlPercentage={portfolio.pnl_percentage}
              />
            </section>

            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-foreground">Tus inversiones</h2>
                <AddInvestmentForm onSuccess={handleRefresh} />
              </div>
              <InvestmentList
                investments={portfolio.investments}
                prices={prices || {}}
                onDelete={handleRefresh}
              />
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
