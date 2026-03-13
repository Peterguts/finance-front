"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Investment } from "@/lib/types";
import { convertUsdToGtq, formatCurrency, formatPercentage } from "@/lib/utils";

interface PortfolioAllocationChartProps {
  investments: Investment[];
  prices: Record<string, number>;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

export function PortfolioAllocationChart({
  investments,
  prices,
}: PortfolioAllocationChartProps) {
  const items = investments.map((inv) => {
    const currentPrice = prices[inv.ticker] || inv.buy_price;
    const valueUsd = inv.amount * currentPrice;
    const valueGtq = convertUsdToGtq(valueUsd);
    return { name: inv.ticker, valueUsd, valueGtq, value: valueUsd };
  });

  const totalUsd = items.reduce((sum, item) => sum + item.valueUsd, 0);

  if (!investments.length || totalUsd <= 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Añade inversiones para ver la distribución del portafolio.
        </p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => b.valueUsd - a.valueUsd);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground mb-1">Distribución del portafolio</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Porcentaje del valor total por activo
      </p>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={sorted}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {sorted.map((_, index) => (
                <Cell key={sorted[index].name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
              }}
              labelStyle={{ color: "var(--color-foreground)" }}
              formatter={(value: number, name: string, props: { payload: { valueGtq: number } }) => {
                const pct = totalUsd > 0 ? (value / totalUsd) * 100 : 0;
                return [
                  `${formatCurrency(value, "USD")} · ${formatCurrency(props.payload.valueGtq, "GTQ")} (${formatPercentage(pct)})`,
                  name,
                ];
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              formatter={(value) => {
                const item = sorted.find((i) => i.name === value);
                const pct = item && totalUsd > 0 ? (item.valueUsd / totalUsd) * 100 : 0;
                return (
                  <span className="text-sm text-foreground">
                    {value} · {formatPercentage(pct)}
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {sorted.map((item, index) => {
          const pct = (item.valueUsd / totalUsd) * 100;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.valueUsd, "USD")} · {formatCurrency(item.valueGtq, "GTQ")}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground tabular-nums">
                {formatPercentage(pct)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
