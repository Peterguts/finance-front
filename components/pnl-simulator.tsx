"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, Sparkles } from "lucide-react";
import {
  fetchSimulatorAssets,
  fetchSimulatorHistory,
  simulateScenario,
} from "@/lib/api";
import type { SimulatorAsset, SimulatorScenarioResult } from "@/lib/types";
import { cn, convertUsdToGtq, formatCurrency, formatNumber, formatPercentage } from "@/lib/utils";

function formatQty(value: number): string {
  if (value >= 100) return formatNumber(value, 2);
  if (value >= 1) return formatNumber(value, 4);
  return formatNumber(value, 6);
}

export function PnlSimulator() {
  const { data: assets, isLoading: assetsLoading, error: assetsError } = useSWR(
    "sim-assets",
    fetchSimulatorAssets,
    { refreshInterval: 30000 }
  );
  const [selectedTicker, setSelectedTicker] = useState("");
  const [changePct, setChangePct] = useState(0);
  const [scenario, setScenario] = useState<SimulatorScenarioResult | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [debouncedChangePct, setDebouncedChangePct] = useState(0);

  useEffect(() => {
    if (!selectedTicker && assets && assets.length > 0) {
      setSelectedTicker(assets[0].ticker);
    }
  }, [assets, selectedTicker]);

  const selectedAsset: SimulatorAsset | null = useMemo(
    () => (assets ?? []).find((a) => a.ticker === selectedTicker) ?? null,
    [assets, selectedTicker]
  );

  const { data: history, isLoading: historyLoading } = useSWR(
    selectedTicker ? ["sim-history", selectedTicker] : null,
    ([, ticker]: [string, string]) => fetchSimulatorHistory(ticker, { period: "3mo", interval: "1d", limit: 120 }),
    { refreshInterval: 300000 }
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedChangePct(changePct), 180);
    return () => clearTimeout(t);
  }, [changePct]);

  useEffect(() => {
    if (!selectedTicker) return;
    let cancelled = false;
    const run = async () => {
      setScenarioLoading(true);
      setScenarioError(null);
      try {
        const res = await simulateScenario({ ticker: selectedTicker, change_pct: debouncedChangePct });
        if (!cancelled) setScenario(res);
      } catch (err) {
        if (!cancelled) {
          setScenarioError(err instanceof Error ? err.message : "No se pudo simular el escenario");
          setScenario(null);
        }
      } finally {
        if (!cancelled) setScenarioLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedTicker, debouncedChangePct]);

  const pnl = scenario?.pnl ?? 0;
  const roi = scenario?.roi_pct ?? 0;
  const projectedPrice = scenario?.projected_price ?? selectedAsset?.current_price ?? 0;
  const currentPrice = selectedAsset?.current_price ?? 0;
  const currentValue = selectedAsset?.current_value ?? 0;
  const projectedValue = scenario?.projected_value ?? 0;
  const costBasis = selectedAsset?.cost_basis ?? 0;
  const isPositive = pnl >= 0;
  const chartDomain = useMemo(() => {
    const closes = (history ?? []).map((h) => h.close);
    const vals = [...closes, projectedPrice, currentPrice].filter((v) => Number.isFinite(v) && v > 0);
    if (vals.length === 0) return [0, 10] as [number, number];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.15, max * 0.03);
    return [Math.max(0, min - pad), max + pad] as [number, number];
  }, [history, projectedPrice, currentPrice]);

  if (assetsError) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-destructive">
        No se pudo cargar el simulador.
      </div>
    );
  }

  if (assetsLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay posiciones activas para simular.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/90 p-4 sm:p-6 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[var(--chart-4)]" />
          Simulador de P&L
        </h3>
        <p className="text-sm text-muted-foreground">
          Vista simple: lo que tienes hoy y lo que tendrias con tu prediccion.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tus activos
          </p>
          <div className="grid gap-2 max-h-[420px] overflow-auto pr-1">
            {assets.map((a) => {
              const active = a.ticker === selectedTicker;
              return (
                <button
                  key={a.ticker}
                  type="button"
                  onClick={() => {
                    setSelectedTicker(a.ticker);
                    setChangePct(0);
                  }}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-all",
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <p className="font-semibold text-foreground">{a.ticker}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty {formatQty(a.quantity)}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    Hoy {formatCurrency(a.current_value, "USD")}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Activo seleccionado"
              value={selectedAsset?.ticker ?? "—"}
              secondary={`Cantidad ${formatQty(selectedAsset?.quantity ?? 0)}`}
            />
            <Metric
              label="Coste base"
              value={formatCurrency(costBasis, "USD")}
              secondary={formatCurrency(convertUsdToGtq(costBasis), "GTQ")}
            />
            <Metric
              label="Precio actual (unidad)"
              value={formatCurrency(currentPrice, "USD")}
              secondary={formatCurrency(convertUsdToGtq(currentPrice), "GTQ")}
            />
            <Metric
              label="Precio proyectado (unidad)"
              value={formatCurrency(projectedPrice, "USD")}
              secondary={formatCurrency(convertUsdToGtq(projectedPrice), "GTQ")}
              positive={isPositive}
            />
          </div>

          <div className="rounded-xl border border-border bg-gradient-to-br from-muted/20 to-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Historico reciente ({selectedAsset?.ticker ?? "—"})
              </p>
              <p className="text-xs text-muted-foreground">
                Escenario: <span className="font-mono">{formatCurrency(projectedPrice, "USD")}</span>
              </p>
            </div>
            {historyLoading ? (
              <div className="h-56 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                    <YAxis
                      domain={chartDomain}
                      tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                      width={58}
                      tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.75rem",
                      }}
                      formatter={(v: number) => [
                        `${formatCurrency(v, "USD")} · ${formatCurrency(convertUsdToGtq(v), "GTQ")}`,
                        "Precio",
                      ]}
                      labelFormatter={(label) => `Fecha: ${label}`}
                    />
                    <ReferenceLine
                      y={projectedPrice}
                      stroke={isPositive ? "var(--chart-1)" : "var(--chart-5)"}
                      strokeDasharray="5 4"
                    />
                    <defs>
                      <linearGradient id="simArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="close" stroke="none" fill="url(#simArea)" />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="var(--chart-2)"
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="sim-slider" className="text-sm font-medium text-foreground">
                Prediccion de precio: {changePct > 0 ? "+" : ""}{formatNumber(changePct, 2)}%
              </label>
              <p className="text-sm text-muted-foreground text-right">
                Nuevo precio <span className="font-mono">{formatCurrency(projectedPrice, "USD")}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[-30, -15, 0, 15, 30, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setChangePct(preset)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    changePct === preset
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {preset > 0 ? "+" : ""}
                  {preset}%
                </button>
              ))}
            </div>
            <input
              id="sim-slider"
              type="range"
              min={-50}
              max={50}
              step={0.1}
              value={changePct}
              onChange={(e) => setChangePct(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {scenarioError ? (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {scenarioError}
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Hoy vs Escenario</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <Metric
                  label="Valor actual total"
                  value={formatCurrency(currentValue, "USD")}
                  secondary={formatCurrency(convertUsdToGtq(currentValue), "GTQ")}
                  loading={scenarioLoading}
                />
                <Metric
                  label="Valor proyectado total"
                  value={formatCurrency(projectedValue, "USD")}
                  secondary={formatCurrency(convertUsdToGtq(projectedValue), "GTQ")}
                  loading={scenarioLoading}
                  positive={isPositive}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric
                  label="Resultado estimado"
                  value={`${pnl >= 0 ? "+" : ""}${formatCurrency(pnl, "USD")}`}
                  secondary={`${pnl >= 0 ? "+" : ""}${formatCurrency(convertUsdToGtq(pnl), "GTQ")}`}
                  loading={scenarioLoading}
                  positive={isPositive}
                />
                <Metric
                  label="ROI proyectado"
                  value={formatPercentage(roi)}
                  secondary={`Sobre coste base ${formatCurrency(costBasis, "USD")}`}
                  loading={scenarioLoading}
                  positive={isPositive}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  secondary,
  loading,
  positive,
}: {
  label: string;
  value: string;
  secondary: string;
  loading?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <p
            className={cn(
              "mt-2 font-mono text-2xl font-semibold",
              positive == null && "text-foreground",
              positive === true && "text-success",
              positive === false && "text-destructive"
            )}
          >
            {value}
          </p>
          <p className="text-xs text-muted-foreground font-mono">{secondary}</p>
        </>
      )}
    </div>
  );
}


