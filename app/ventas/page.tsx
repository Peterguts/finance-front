"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { SellForm } from "@/components/sell-form";
import { AppHeader } from "@/components/app-header";
import { fetchPortfolioSummary } from "@/lib/api";

export default function VentasPage() {
  const {
    data: portfolio,
    error,
    isLoading,
    mutate: mutatePortfolio,
  } = useSWR("portfolio", fetchPortfolioSummary, { refreshInterval: 30000 });

  const handleRefresh = () => {
    mutatePortfolio();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader onRefresh={handleRefresh} isRefreshing={isLoading} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registra ventas de acciones para llevar el control de ganancias y pérdidas realizadas.
          </p>
        </div>
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
            <SellForm positions={portfolio.positions} onSuccess={handleRefresh} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
