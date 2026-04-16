"use client";

import useSWR from "swr";
import { AppHeader } from "@/components/app-header";
import { PnlSimulator } from "@/components/pnl-simulator";
import { fetchUsdGtqRate } from "@/lib/api";
import { formatNumber, setUsdToGtqRate } from "@/lib/utils";
import { useEffect } from "react";

export default function SimuladorPage() {
  const { data: fxRate } = useSWR("fx-usd-gtq", fetchUsdGtqRate, { refreshInterval: 300000 });

  useEffect(() => {
    if (fxRate?.rate) setUsdToGtqRate(fxRate.rate);
  }, [fxRate?.rate]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/30">
      <AppHeader fxRateLabel={fxRate?.rate ? formatNumber(fxRate.rate, 4) : undefined} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-6">
        <section className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-sm animate-in fade-in duration-300">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Simulador Interactivo de Inversiones
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
            Proyecta escenarios de precio, visualiza su impacto en tu portafolio y evalua
            ganancia/perdida y ROI en tiempo real.
          </p>
        </section>

        <PnlSimulator />
      </main>
    </div>
  );
}

