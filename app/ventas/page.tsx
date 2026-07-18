"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { SellForm } from "@/components/sell-form";
import { AppHeader } from "@/components/app-header";
import { PageHeader } from "@/components/page-header";
import { fetchPortfolioSummary, fetchUsdGtqRate } from "@/lib/api";
import { formatNumber, setUsdToGtqRate } from "@/lib/utils";
import { useEffect } from "react";

export default function VentasPage() {
  const {
    data: portfolio,
    error,
    isLoading,
    mutate: mutatePortfolio,
  } = useSWR("portfolio", fetchPortfolioSummary, { refreshInterval: 30000 });
  const { data: fxRate } = useSWR("fx-usd-gtq", fetchUsdGtqRate, { refreshInterval: 300000 });

  const handleRefresh = () => {
    mutatePortfolio();
  };

  useEffect(() => {
    if (fxRate?.rate) setUsdToGtqRate(fxRate.rate);
  }, [fxRate?.rate]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        fxRateLabel={fxRate?.rate ? formatNumber(fxRate.rate, 4) : undefined}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <PageHeader
          eyebrow="Ganancias y pérdidas realizadas"
          title="Ventas"
          subtitle="Registra ventas de acciones para llevar el control de ganancias y pérdidas realizadas."
        />
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
          <section className="space-y-6">
            <SellForm positions={portfolio.positions ?? []} onSuccess={handleRefresh} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
