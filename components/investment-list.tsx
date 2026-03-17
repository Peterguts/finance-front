"use client";

import { useState } from "react";
import { Trash2, TrendingUp, TrendingDown, Loader2, TrendingDown as SellIcon } from "lucide-react";
import type { Investment, PortfolioPosition } from "@/lib/types";
import {
  cn,
  convertUsdToGtq,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getCurrentPrice,
} from "@/lib/utils";
import { createSale, deleteInvestment, fetchPrice } from "@/lib/api";

interface InvestmentListProps {
  investments: Investment[];
  prices: Record<string, number>;
  positionsByTicker: Record<string, PortfolioPosition>;
  onChange: () => void;
}

export function InvestmentList({
  investments,
  prices,
  positionsByTicker,
  onChange,
}: InvestmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sellingTicker, setSellingTicker] = useState<string | null>(null);
  const [sellQuantity, setSellQuantity] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<string>("");
  const [sellError, setSellError] = useState<string | null>(null);
  const [isSelling, setIsSelling] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteInvestment(id);
      onChange();
    } catch (error) {
      console.error("Failed to delete investment:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const openSellModal = async (ticker: string) => {
    const pos = positionsByTicker[ticker];
    if (!pos || pos.quantity <= 0) {
      setSellError("No tienes cantidad disponible para vender de este activo.");
      return;
    }
    setSellError(null);
    setSellingTicker(ticker);
    setSellQuantity(String(pos.quantity));
    setSellPrice("");
    setPriceLoading(true);
    try {
      const res = await fetchPrice(ticker);
      if (res?.price != null && !Number.isNaN(res.price)) {
        setSellPrice(String(res.price));
      }
    } catch {
      // ignorar, el usuario puede escribir el precio
    } finally {
      setPriceLoading(false);
    }
  };

  const closeSellModal = () => {
    setSellingTicker(null);
    setSellQuantity("");
    setSellPrice("");
    setSellError(null);
    setIsSelling(false);
    setPriceLoading(false);
  };

  const handleConfirmSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingTicker) return;
    setSellError(null);
    const pos = positionsByTicker[sellingTicker];
    const maxQty = pos?.quantity ?? 0;
    const qty = parseFloat(sellQuantity);
    if (!pos || maxQty <= 0) {
      setSellError("No hay posición disponible para vender.");
      return;
    }
    if (Number.isNaN(qty) || qty <= 0) {
      setSellError("La cantidad debe ser un número positivo.");
      return;
    }
    if (qty > maxQty) {
      setSellError(`Cantidad máxima disponible: ${maxQty}`);
      return;
    }
    const priceNum = parseFloat(sellPrice);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setSellError("El precio de venta debe ser un número positivo.");
      return;
    }
    setIsSelling(true);
    try {
      await createSale({
        ticker: sellingTicker.trim().toUpperCase(),
        quantity: qty,
        sell_price: priceNum,
      });
      closeSellModal();
      onChange();
    } catch (error) {
      console.error("Failed to create sale:", error);
      setSellError(
        error instanceof Error ? error.message : "No se pudo registrar la venta. Intenta de nuevo."
      );
    } finally {
      setIsSelling(false);
    }
  };

  if (investments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Aún no hay inversiones. Añade la primera arriba.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: tarjetas */}
      <div className="grid gap-3 sm:hidden">
        {investments.map((investment) => {
          const currentPrice = getCurrentPrice(prices, investment.ticker, investment.buy_price);
          const investedValueUsd = investment.amount * investment.buy_price;
          const currentValueUsd = investment.amount * currentPrice;
          const pnlUsd = currentValueUsd - investedValueUsd;
          const pnlPercent = investedValueUsd > 0 ? (pnlUsd / investedValueUsd) * 100 : 0;
          const isPositive = pnlUsd > 0;
          const isNegative = pnlUsd < 0;

          const displayTicker =
            investment.ticker.toUpperCase().endsWith("-USD")
              ? investment.ticker.toUpperCase().replace(/-USD$/, "")
              : investment.ticker;

          return (
            <div key={investment.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      isPositive && "bg-success/10 text-success",
                      isNegative && "bg-destructive/10 text-destructive",
                      !isPositive && !isNegative && "bg-muted text-muted-foreground"
                    )}
                  >
                    {displayTicker.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{displayTicker}</p>
                    {!!investment.timestamp && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(investment.timestamp).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openSellModal(investment.ticker)}
                    className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <SellIcon className="mr-1 h-3.5 w-3.5" />
                    Vender
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(investment.id)}
                    disabled={deletingId === investment.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                    aria-label={`Eliminar ${investment.ticker}`}
                  >
                    {deletingId === investment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Cantidad
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatNumber(investment.amount)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Valor
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatCurrency(currentValueUsd, "USD")}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Compra
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatCurrency(investment.buy_price, "USD")}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Actual
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatCurrency(currentPrice, "USD")}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">G/P</span>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold",
                      isPositive && "text-success",
                      isNegative && "text-destructive",
                      !isPositive && !isNegative && "text-muted-foreground"
                    )}
                  >
                    {pnlUsd > 0 ? "+" : ""}
                    {formatCurrency(pnlUsd, "USD")}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {pnlPercent !== 0 ? formatPercentage(pnlPercent) : "Pendiente"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop/tablet: tabla */}
      <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                  Activo
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                  Cantidad
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                  Precio compra
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                  Precio actual
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                  Valor
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                  G/P
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {investments.map((investment) => {
                const currentPrice = getCurrentPrice(
                  prices,
                  investment.ticker,
                  investment.buy_price
                );
                const investedValueUsd = investment.amount * investment.buy_price;
                const currentValueUsd = investment.amount * currentPrice;
                const pnlUsd = currentValueUsd - investedValueUsd;
                const pnlPercent =
                  investedValueUsd > 0 ? (pnlUsd / investedValueUsd) * 100 : 0;
                const isPositive = pnlUsd >= 0;

                const currentValueGtq = convertUsdToGtq(currentValueUsd);
                const pnlGtq = convertUsdToGtq(pnlUsd);

                const displayTicker =
                  investment.ticker.toUpperCase().endsWith("-USD")
                    ? investment.ticker.toUpperCase().replace(/-USD$/, "")
                    : investment.ticker;

                return (
                  <tr
                    key={investment.id}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                            isPositive
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {displayTicker.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{displayTicker}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(investment.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                      {formatNumber(investment.amount)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                      {formatCurrency(investment.buy_price, "USD")}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                      {formatCurrency(currentPrice, "USD")}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground">
                      <div>{formatCurrency(currentValueUsd, "USD")}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(currentValueGtq, "GTQ")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1",
                          isPositive ? "text-success" : "text-destructive"
                        )}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-mono text-sm font-medium">
                          {formatPercentage(pnlPercent)}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "font-mono text-xs",
                          isPositive ? "text-success/70" : "text-destructive/70"
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {formatCurrency(pnlUsd, "USD")}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {isPositive ? "+" : ""}
                        {formatCurrency(pnlGtq, "GTQ")}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openSellModal(investment.ticker)}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-border px-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                          aria-label={`Vender ${investment.ticker}`}
                        >
                          <SellIcon className="mr-1 h-3.5 w-3.5" />
                          Vender
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(investment.id)}
                          disabled={deletingId === investment.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label={`Eliminar ${investment.ticker}`}
                        >
                          {deletingId === investment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {sellingTicker && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
          <form
            onSubmit={handleConfirmSell}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Vender {sellingTicker}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirma la cantidad y el precio para registrar la venta.
                </p>
              </div>
              <button
                type="button"
                onClick={closeSellModal}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            {sellError && (
              <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {sellError}
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Disponible</span>
                <span className="font-mono">
                  {positionsByTicker[sellingTicker]?.quantity ?? 0}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="inline-sell-qty"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Cantidad a vender
                  </label>
                  <input
                    id="inline-sell-qty"
                    type="number"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    step="any"
                    min="0"
                    className={cn(
                      "w-full rounded-md border bg-input px-3 py-2 text-sm",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    )}
                  />
                </div>
                <div>
                  <label
                    htmlFor="inline-sell-price"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Precio de venta ($)
                  </label>
                  <input
                    id="inline-sell-price"
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    step="any"
                    min="0"
                    className={cn(
                      "w-full rounded-md border bg-input px-3 py-2 text-sm",
                      "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    )}
                  />
                  {priceLoading && (
                    <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Obteniendo precio actual…
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSellModal}
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSelling}
                className="inline-flex items-center gap-2 rounded-md bg-destructive/90 px-4 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive disabled:opacity-50"
              >
                {isSelling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Vendiendo…
                  </>
                ) : (
                  <>
                    <SellIcon className="h-3.5 w-3.5" />
                    Confirmar venta
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
