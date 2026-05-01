"use client";

import useSWR from "swr";
import Link from "next/link";
import { Loader2, PiggyBank } from "lucide-react";
import { InvestmentList } from "@/components/investment-list";
import { AddInvestmentForm } from "@/components/add-investment-form";
import { AppHeader } from "@/components/app-header";
import {
  fetchPortfolioSummary,
  fetchPricesForTickers,
  fetchPricesStatus,
  fetchUsdGtqRate,
} from "@/lib/api";
import type { PortfolioPosition } from "@/lib/types";
import { formatNumber, isMeaningfulOpenPosition, normalizeTicker, setUsdToGtqRate } from "@/lib/utils";
import { useEffect, useMemo } from "react";

export default function InversionesPage() {
  const {
    data: portfolio,
    error,
    isLoading,
    mutate: mutatePortfolio,
  } = useSWR("portfolio", fetchPortfolioSummary, { refreshInterval: 30000 });

  const tickers = portfolio?.investments?.map((i) => i.ticker).filter(Boolean) ?? [];
  const tickerKey =
    tickers.length > 0 ? ["prices", [...new Set(tickers)].sort().join(",")] : null;
  const { data: prices, mutate: mutatePrices } = useSWR(
    tickerKey,
    ([, tickerStr]: [string, string]) =>
      fetchPricesForTickers(tickerStr ? tickerStr.split(",") : []),
    { refreshInterval: 30000 }
  );

  const { data: pricesStatus } = useSWR("prices-status", fetchPricesStatus, {
    refreshInterval: 60000,
  });
  const { data: fxRate } = useSWR("fx-usd-gtq", fetchUsdGtqRate, { refreshInterval: 300000 });

  const positionsByTicker: Record<string, PortfolioPosition> =
    (portfolio?.positions ?? []).reduce((acc, pos) => {
      acc[pos.ticker] = pos;
      return acc;
    }, {} as Record<string, PortfolioPosition>);

  const investmentsOpenOnly = useMemo(() => {
    const open = new Set(
      (portfolio?.positions ?? [])
        .filter((p) => isMeaningfulOpenPosition(p.quantity))
        .map((p) => normalizeTicker(p.ticker))
    );
    return (portfolio?.investments ?? []).filter((inv) =>
      open.has(normalizeTicker(inv.ticker))
    );
  }, [portfolio]);

  const handleRefresh = () => {
    mutatePortfolio(undefined, { revalidate: true });
    mutatePrices(undefined, { revalidate: true });
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
          <section>
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <AddInvestmentForm onSuccess={handleRefresh} />
              <Link
                href="/depositos"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <PiggyBank className="h-4 w-4" />
                Añadir depósito
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Posiciones abiertas.</p>
            <InvestmentList
              investments={investmentsOpenOnly}
              prices={prices ?? {}}
              positionsByTicker={positionsByTicker}
              onChange={handleRefresh}
            />
          </section>
        ) : null}
      </main>
    </div>
  );
}
