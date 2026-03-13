"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { createInvestment } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddInvestmentFormProps {
  onSuccess: () => void;
}

export function AddInvestmentForm({ onSuccess }: AddInvestmentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticker, setTicker] = useState("");
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");

  const resetForm = () => {
    setTicker("");
    setAmount("");
    setBuyPrice("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!ticker.trim()) {
      setError("El símbolo (ticker) es obligatorio");
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("La cantidad debe ser un número positivo");
      return;
    }
    const buyPriceNum = parseFloat(buyPrice);
    if (isNaN(buyPriceNum) || buyPriceNum <= 0) {
      setError("El precio de compra debe ser un número positivo");
      return;
    }
    setIsLoading(true);
    try {
      await createInvestment({
        ticker: ticker.trim().toUpperCase(),
        amount: amountNum,
        buy_price: buyPriceNum,
      });
      resetForm();
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo añadir la inversión");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:opacity-90"
      >
        <Plus className="h-4 w-4" />
        Añadir inversión
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Nueva inversión</h3>
        <button
          type="button"
          onClick={() => { setIsOpen(false); resetForm(); }}
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
          <label htmlFor="ticker" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Símbolo (ticker)
          </label>
          <input
            id="ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="BTC, AAPL, META..."
            maxLength={10}
            className={cn(
              "w-full rounded-md border bg-input px-3 py-2 text-sm uppercase",
              "placeholder:text-muted-foreground placeholder:normal-case",
              "focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        </div>
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Cantidad
          </label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            className={cn(
              "w-full rounded-md border bg-input px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        </div>
        <div>
          <label htmlFor="buyPrice" className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Precio de compra ($)
          </label>
          <input
            id="buyPrice"
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            className={cn(
              "w-full rounded-md border bg-input px-3 py-2 text-sm",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Añadiendo…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Añadir inversión
            </>
          )}
        </button>
      </div>
    </form>
  );
}
