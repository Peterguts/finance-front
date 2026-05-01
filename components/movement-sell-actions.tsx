"use client";

import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import type { Movement } from "@/lib/types";
import { deleteSale, updateSale } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MovementSellActionsProps {
  movement: Movement;
  onSuccess: () => void;
}

export function MovementSellActions({ movement, onSuccess }: MovementSellActionsProps) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(movement.quantity));
  const [price, setPrice] = useState(String(movement.price));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (movement.type !== "sell") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const openEdit = () => {
    setError(null);
    setQty(String(movement.quantity));
    setPrice(String(movement.price));
    setEditing(true);
  };

  const closeEdit = () => {
    setEditing(false);
    setError(null);
    setBusy(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const q = parseFloat(qty);
    const p = parseFloat(price);
    if (Number.isNaN(q) || q <= 0) {
      setError("Cantidad inválida.");
      return;
    }
    if (Number.isNaN(p) || p <= 0) {
      setError("Precio inválido.");
      return;
    }
    setBusy(true);
    try {
      await updateSale(movement.id, { quantity: q, sell_price: p });
      closeEdit();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar esta venta? El portafolio y el efectivo estimado se recalcularán.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteSale(movement.id);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={openEdit}
          disabled={busy}
          className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
          title="Corregir cantidad o precio de venta"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex h-8 items-center rounded-md border border-border px-2 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          title="Eliminar venta"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {error && !editing && (
        <p className="mt-1 text-[11px] text-destructive text-right max-w-[140px] ml-auto">{error}</p>
      )}

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <form
            onSubmit={handleSave}
            className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-lg"
          >
            <h3 className="text-sm font-semibold text-foreground">Corregir venta · {movement.ticker}</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Ajusta la cantidad si hubo un error (ej. 0.8 en vez de 0.0845). El G/P se recalcula con tu
              precio medio de compra.
            </p>
            {error && (
              <div className="mb-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Cantidad</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  step="any"
                  min="0"
                  className={cn(
                    "w-full rounded-md border bg-input px-3 py-2 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Precio venta ($)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="any"
                  min="0"
                  className={cn(
                    "w-full rounded-md border bg-input px-3 py-2 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50"
                  )}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
