"use client";

import useSWR from "swr";
import Link from "next/link";
import { Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { PortfolioSummary } from "@/components/portfolio-summary";
import { PortfolioAllocationChart } from "@/components/portfolio-allocation-chart";
import { AppHeader } from "@/components/app-header";
import { fetchPortfolioSummary, fetchPrices, fetchPricesStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const {
    data: portfolio,
    error: portfolioError,
    isLoading: portfolioLoading,
    mutate: mutatePortfolio,
  } = useSWR("portfolio", fetchPortfolioSummary, { refreshInterval: 30000 });

  const {
    data: prices,
    isLoading: pricesLoading,
    mutate: mutatePrices,
  } = useSWR("prices", fetchPrices, { refreshInterval: 30000 });

  const { data: pricesStatus } = useSWR("prices-status", fetchPricesStatus, {
    refreshInterval: 60000,
  });

  const isLoading = portfolioLoading || pricesLoading;
  const error = portfolioError;

  const handleRefresh = () => {
    mutatePortfolio();
    mutatePrices();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader onRefresh={handleRefresh} isRefreshing={portfolioLoading || pricesLoading} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
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
              <h2 className="sr-only">Resumen</h2>
              <PortfolioSummary
                totalInvested={portfolio.total_invested}
                currentValue={portfolio.current_value}
                totalPnl={portfolio.total_pnl}
                pnlPercentage={portfolio.pnl_percentage}
              />
            </section>

            <section>
              <PortfolioAllocationChart
                investments={portfolio.investments}
                prices={prices || {}}
              />
            </section>

            <section>
              <Link
                href="/inversiones"
                className={cn(
                  "flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-6",
                  "text-foreground no-underline transition-colors hover:bg-muted/50"
                )}
              >
                <div>
                  <p className="font-semibold text-foreground">Gestionar inversiones</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Añadir, editar o eliminar posiciones · {portfolio.investments.length} activos
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            </section>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          Precios vía Yahoo / Finnhub · Tipo de cambio GTQ aproximado
        </p>
      </footer>
    </div>
  );
}
