"use client";

import type { PortfolioPosition } from "@/lib/types";
import {
  convertUsdToGtq,
  formatCurrency,
  formatPercentage,
  isMeaningfulOpenPosition,
  normalizeTicker,
} from "@/lib/utils";

interface PortfolioAllocationChartProps {
  /** Solo posiciones con cantidad > 0; usa current_value del backend (coherente con "Valor actual"). */
  positions: PortfolioPosition[];
}

// Paleta categórica validada (ver globals.css) — orden fijo, nunca reciclada
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

export function PortfolioAllocationChart({ positions }: PortfolioAllocationChartProps) {
  const merged = new Map<string, number>();
  for (const p of positions) {
    if (!isMeaningfulOpenPosition(p.quantity) || p.current_value <= 0) continue;
    const key = normalizeTicker(p.ticker);
    merged.set(key, (merged.get(key) ?? 0) + p.current_value);
  }

  const items = [...merged.entries()]
    .map(([name, valueUsd]) => ({ name, valueUsd, valueGtq: convertUsdToGtq(valueUsd) }))
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const totalUsd = items.reduce((sum, item) => sum + item.valueUsd, 0);

  if (!items.length || totalUsd <= 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay posiciones abiertas con valor de mercado para mostrar la distribución.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Distribución
      </p>
      <h2 className="font-display mt-1 text-xl text-card-foreground">
        ¿Dónde está tu dinero?
      </h2>

      {/* Cinta del portafolio: cada activo es un segmento proporcional */}
      <div
        className="mt-6 flex h-5 w-full gap-[2px]"
        role="img"
        aria-label={`Distribución del portafolio: ${items
          .map((i) => `${i.name} ${formatPercentage((i.valueUsd / totalUsd) * 100)}`)
          .join(", ")}`}
      >
        {items.map((item, index) => {
          const pct = (item.valueUsd / totalUsd) * 100;
          return (
            <div
              key={item.name}
              className="rounded-[4px] transition-opacity hover:opacity-80"
              style={{
                width: `${pct}%`,
                minWidth: "6px",
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
              title={`${item.name} · ${formatCurrency(item.valueUsd, "USD")} (${formatPercentage(pct)})`}
            />
          );
        })}
      </div>

      {/* Filas: etiqueta directa de cada segmento (mismo orden y color) */}
      <div className="mt-5 divide-y divide-border">
        {items.map((item, index) => {
          const pct = (item.valueUsd / totalUsd) * 100;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <p className="font-mono text-sm font-semibold text-foreground">{item.name}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <p className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:block">
                  {formatCurrency(item.valueUsd, "USD")} · {formatCurrency(item.valueGtq, "GTQ")}
                </p>
                <p className="w-16 text-right font-mono text-sm font-medium text-foreground tabular-nums">
                  {formatPercentage(pct)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
