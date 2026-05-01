"use client";

import { useState } from "react";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  Loader2,
  TrendingDown as SellIcon,
  Pencil,
} from "lucide-react";
import type { Investment, PortfolioPosition } from "@/lib/types";
import {
  cn,
  convertUsdToGtq,
  formatCurrency,
  formatNumber,
  formatPercentage,
  getCurrentPrice,
  normalizeTicker,
} from "@/lib/utils";
import { createSale, deleteInvestment, fetchPrice, updateInvestment } from "@/lib/api";

interface InvestmentListProps {
  investments: Investment[];
  prices: Record<string, number>;
  positionsByTicker: Record<string, PortfolioPosition>;
  onChange: () => void;
}

/** Filas agrupadas por ticker: números mostrados alineados con posición neta del backend cuando existe. */
function rowMetrics(
  row: { ticker: string; amount: number; buy_price: number },
  positionsByTicker: Record<string, PortfolioPosition>,
  prices: Record<string, number>
) {
  const pos = positionsByTicker[row.ticker];
  const priceFallback = getCurrentPrice(prices, row.ticker, row.buy_price);

  if (pos && pos.quantity > 0) {
    const avgBuy = pos.cost_basis / pos.quantity;
    return {
      quantity: pos.quantity,
      buyPrice: avgBuy,
      currentPrice: pos.current_value / pos.quantity,
      investedUsd: pos.cost_basis,
      currentValueUsd: pos.current_value,
      pnlUsd: pos.unrealized_pnl,
      pnlIsRealizedOnly: false,
    };
  }

  if (pos && pos.quantity <= 0 && row.amount > 0) {
    return {
      quantity: 0,
      buyPrice: row.buy_price,
      currentPrice: priceFallback,
      investedUsd: 0,
      currentValueUsd: 0,
      pnlUsd: pos.realized_pnl,
      pnlIsRealizedOnly: true,
    };
  }

  const qty = row.amount;
  const buyP = row.buy_price;
  const curP = priceFallback;
  return {
    quantity: qty,
    buyPrice: buyP,
    currentPrice: curP,
    investedUsd: qty * buyP,
    currentValueUsd: qty * curP,
    pnlUsd: qty * curP - qty * buyP,
    pnlIsRealizedOnly: false,
  };
}

export function InvestmentList({
  investments,
  prices,
  positionsByTicker,
  onChange,
}: InvestmentListProps) {
  const groupedInvestments = Object.values(
    investments.reduce((acc, inv) => {
      const key = normalizeTicker(inv.ticker);
      const prev = acc[key];
      if (!prev) {
        acc[key] = {
          ticker: key,
          amount: inv.amount,
          invested: inv.amount * inv.buy_price,
          timestamp: inv.timestamp || "",
          ids: [inv.id],
          source: inv,
        };
      } else {
        prev.amount += inv.amount;
        prev.invested += inv.amount * inv.buy_price;
        if ((inv.timestamp || "") > (prev.timestamp || "")) {
          prev.timestamp = inv.timestamp || "";
          prev.source = inv;
        }
        prev.ids.push(inv.id);
      }
      return acc;
    }, {} as Record<string, {
      ticker: string;
      amount: number;
      invested: number;
      timestamp: string;
      ids: string[];
      source: Investment;
    }>)
  ).map((g) => ({
    id: g.source.id,
    ticker: g.ticker,
    amount: g.amount,
    buy_price: g.amount > 0 ? g.invested / g.amount : 0,
    timestamp: g.timestamp,
    canEdit: g.ids.length === 1,
    canDelete: g.ids.length === 1,
  }));

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sellingTicker, setSellingTicker] = useState<string | null>(null);
  const [sellQuantity, setSellQuantity] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<string>("");
  const [sellError, setSellError] = useState<string | null>(null);
  const [isSelling, setIsSelling] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editBuyPrice, setEditBuyPrice] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const openEditModal = (inv: Investment & { canEdit?: boolean }) => {
    if (!inv.canEdit) {
      setEditError("Esta posición tiene múltiples compras. Edita cada compra individual desde movimientos.");
      return;
    }
    setEditError(null);
    setEditingInvestment(inv);
    setEditAmount(String(inv.amount));
    setEditBuyPrice(String(inv.buy_price));
  };

  const closeEditModal = () => {
    setEditingInvestment(null);
    setEditAmount("");
    setEditBuyPrice("");
    setEditError(null);
    setIsSavingEdit(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvestment) return;
    setEditError(null);
    const qty = parseFloat(editAmount);
    const priceNum = parseFloat(editBuyPrice);
    if (Number.isNaN(qty) || qty <= 0) {
      setEditError("La cantidad debe ser un número positivo.");
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setEditError("El precio de compra debe ser un número positivo.");
      return;
    }
    setIsSavingEdit(true);
    try {
      await updateInvestment(editingInvestment.id, {
        amount: qty,
        buy_price: priceNum,
      });
      closeEditModal();
      onChange();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo."
      );
    } finally {
      setIsSavingEdit(false);
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
        ticker: normalizeTicker(sellingTicker.trim()),
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

  if (groupedInvestments.length === 0) {
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
        {groupedInvestments.map((investment) => {
          const m = rowMetrics(investment, positionsByTicker, prices);
          const pnlPercent = m.investedUsd > 0 ? (m.pnlUsd / m.investedUsd) * 100 : 0;
          const isPositive = m.pnlUsd > 0;
          const isNegative = m.pnlUsd < 0;

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
                    onClick={() => openEditModal(investment)}
                    disabled={!investment.canEdit}
                    className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    title={!investment.canEdit ? "Múltiples compras para este ticker" : "Editar"}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </button>
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
                    disabled={deletingId === investment.id || !investment.canDelete}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                    aria-label={`Eliminar ${investment.ticker}`}
                    title={!investment.canDelete ? "Múltiples compras para este ticker" : "Eliminar"}
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
                  <p className="mt-1 font-mono text-sm text-foreground">{formatNumber(m.quantity)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Valor
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatCurrency(m.currentValueUsd, "USD")}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Compra
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatCurrency(m.buyPrice, "USD")}</p>
                  <p className="text-[11px] text-muted-foreground">{formatCurrency(convertUsdToGtq(m.buyPrice), "GTQ")}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Actual
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">{formatCurrency(m.currentPrice, "USD")}</p>
                  <p className="text-[11px] text-muted-foreground">{formatCurrency(convertUsdToGtq(m.currentPrice), "GTQ")}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  G/P{m.pnlIsRealizedOnly ? " (realizado)" : ""}
                </span>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-mono text-base font-semibold",
                      isPositive && "text-success",
                      isNegative && "text-destructive",
                      !isPositive && !isNegative && "text-muted-foreground"
                    )}
                  >
                    {m.pnlUsd > 0 ? "+" : ""}
                    {m.pnlUsd !== 0 ? formatCurrency(m.pnlUsd, "USD") : "—"}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {m.pnlUsd !== 0
                      ? `${m.pnlUsd > 0 ? "+" : ""}${formatCurrency(convertUsdToGtq(m.pnlUsd), "GTQ")}`
                      : ""}
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground/80">
                    {pnlPercent !== 0 ? formatPercentage(pnlPercent) : m.pnlIsRealizedOnly ? "" : "Pendiente"}
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
              {groupedInvestments.map((investment) => {
                const m = rowMetrics(investment, positionsByTicker, prices);
                const pnlPercent =
                  m.investedUsd > 0 ? (m.pnlUsd / m.investedUsd) * 100 : 0;
                const isPositive = m.pnlUsd >= 0;

                const currentValueGtq = convertUsdToGtq(m.currentValueUsd);
                const pnlGtq = convertUsdToGtq(m.pnlUsd);

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
                      {formatNumber(m.quantity)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                      <div>{formatCurrency(m.buyPrice, "USD")}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(convertUsdToGtq(m.buyPrice), "GTQ")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm text-foreground">
                      <div>{formatCurrency(m.currentPrice, "USD")}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(convertUsdToGtq(m.currentPrice), "GTQ")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground">
                      <div>{formatCurrency(m.currentValueUsd, "USD")}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(currentValueGtq, "GTQ")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className={cn(
                          "flex items-center justify-end gap-1",
                          m.pnlUsd === 0
                            ? "text-muted-foreground"
                            : isPositive
                              ? "text-success"
                              : "text-destructive"
                        )}
                      >
                        <span className="font-mono text-base font-semibold">
                          {m.pnlIsRealizedOnly && m.pnlUsd !== 0 ? "R: " : ""}
                          {m.pnlUsd > 0 ? "+" : ""}
                          {m.pnlUsd !== 0 ? formatCurrency(m.pnlUsd, "USD") : "—"}
                        </span>
                        {m.pnlUsd !== 0 &&
                          (isPositive ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          ))}
                      </div>
                      <p
                        className={cn(
                          "font-mono text-xs",
                          m.pnlUsd === 0
                            ? "text-muted-foreground"
                            : isPositive
                              ? "text-success/70"
                              : "text-destructive/70"
                        )}
                      >
                        {m.pnlUsd !== 0
                          ? `${m.pnlUsd > 0 ? "+" : ""}${formatCurrency(pnlGtq, "GTQ")}`
                          : ""}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {m.investedUsd > 0 && !m.pnlIsRealizedOnly
                          ? formatPercentage(pnlPercent)
                          : m.pnlIsRealizedOnly
                            ? "Ventas"
                            : ""}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(investment)}
                          disabled={!investment.canEdit}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
                          aria-label={`Editar ${investment.ticker}`}
                          title={!investment.canEdit ? "Múltiples compras para este ticker" : "Editar"}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Editar
                        </button>
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
                          disabled={deletingId === investment.id || !investment.canDelete}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label={`Eliminar ${investment.ticker}`}
                          title={!investment.canDelete ? "Múltiples compras para este ticker" : "Eliminar"}
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
      {editingInvestment && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Editar compra · {editingInvestment.ticker}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actualiza cantidad y precio de esta operación.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            {editError && (
              <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {editError}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-amount"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Cantidad
                </label>
                <input
                  id="edit-amount"
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  step="any"
                  min="0"
                  className={cn(
                    "w-full rounded-md border bg-input px-3 py-2 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>
              <div>
                <label
                  htmlFor="edit-buy-price"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Precio compra ($)
                </label>
                <input
                  id="edit-buy-price"
                  type="number"
                  value={editBuyPrice}
                  onChange={(e) => setEditBuyPrice(e.target.value)}
                  step="any"
                  min="0"
                  className={cn(
                    "w-full rounded-md border bg-input px-3 py-2 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Pencil className="h-3.5 w-3.5" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
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
