"use client";

import { useState, useEffect } from "react";
import { TrendingDown, Loader2 } from "lucide-react";
import { createSale, fetchPrice } from "@/lib/api";
import type { PortfolioPosition } from "@/lib/types";
import { cn, isMeaningfulOpenPosition } from "@/lib/utils";

interface SellFormProps {
  positions: PortfolioPosition[];
  onSuccess: () => void;
}

export function SellForm({ positions, onSuccess }: SellFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sellPrice, setSellPrice] = useState("");

  const availablePositions = positions.filter((p) => isMeaningfulOpenPosition(p.quantity));
  const selectedPosition = availablePositions.find((p) => p.ticker === ticker);

  useEffect(() => {
    if (!ticker) {
      setSellPrice("");
      setQuantity("");
      return;
    }
    const maxQty = selectedPosition?.quantity;
    if (maxQty != null && !Number.isNaN(maxQty)) {
      setQuantity(String(maxQty));
    }
    let cancelled = false;
    setPriceLoading(true);
    fetchPrice(ticker)
      .then((res) => {
        if (!cancelled && res?.price != null) setSellPrice(String(res.price));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const resetForm = () => {
    setTicker("");
    setQuantity("");
    setSellPrice("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ticker.trim()) {
      setError("Selecciona un activo");
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("La cantidad debe ser un número positivo");
      return;
    }
    const maxQty = selectedPosition?.quantity ?? 0;
    if (qty > maxQty) {
      setError(`Cantidad máxima disponible: ${maxQty}`);
      return;
    }
    const priceNum = parseFloat(sellPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError("El precio de venta debe ser un número positivo");
      return;
    }
    setIsLoading(true);
    try {
      await createSale({
        ticker: ticker.trim().toUpperCase(),
        quantity: qty,
        sell_price: priceNum,
      });
      resetForm();
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la venta");
    } finally {
      setIsLoading(false);
    }
  };

  if (availablePositions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No tienes posiciones disponibles para vender. Añade compras primero en Inversiones.
        </p>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-destructive/90 px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive"
      >
        <TrendingDown className="h-4 w-4" />
        Vender acciones
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Registrar venta</h3>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            resetForm();
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="sell-ticker" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Activo
          </label>
          <select
            id="sell-ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className={cn(
              "w-full rounded-md border bg-input px-3 py-2 text-sm uppercase",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          >
            <option value="">Seleccionar…</option>
            {availablePositions.map((p) => (
              <option key={p.ticker} value={p.ticker}>
                {p.ticker} — {p.quantity} disp.
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sell-qty" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Cantidad
          </label>
          <input
            id="sell-qty"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={selectedPosition ? `Máx. ${selectedPosition.quantity}` : "0"}
            step="any"
            min="0"
            max={selectedPosition?.quantity}
            className={cn(
              "w-full rounded-md border bg-input px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
          {selectedPosition && (
            <p className="mt-1 text-xs text-muted-foreground">
              Disponible: {selectedPosition.quantity}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="sell-price" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Precio de venta ($)
          </label>
          <input
            id="sell-price"
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            className={cn(
              "w-full rounded-md border bg-input px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
          {priceLoading && (
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Precio actual…
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !ticker || !quantity || !sellPrice}
          className="inline-flex items-center gap-2 rounded-lg bg-destructive/90 px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Vendiendo…
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4" />
              Confirmar venta
            </>
          )}
        </button>
      </div>
    </form>
  );
}
