"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import {
  createDeposit,
  deleteDeposit,
  fetchDeposits,
  fetchUsdGtqRate,
  updateDeposit,
} from "@/lib/api";
import type { Deposit } from "@/lib/types";
import { cn, convertUsdToGtq, formatCurrency, formatNumber, setUsdToGtqRate } from "@/lib/utils";
import { useEffect } from "react";

function computeTotal(amount: number, commissionPct: number): number {
  const fee = amount * (commissionPct / 100);
  return Math.round((amount + fee) * 100) / 100;
}

export default function DepositosPage() {
  const { data: deposits, error, isLoading, mutate } = useSWR(
    "deposits",
    fetchDeposits,
    { refreshInterval: 30000 }
  );
  const { data: fxRate } = useSWR("fx-usd-gtq", fetchUsdGtqRate, { refreshInterval: 300000 });

  const [formDate, setFormDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [formAmount, setFormAmount] = useState("");
  const [formPct, setFormPct] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [editing, setEditing] = useState<Deposit | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPct, setEditPct] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amount = parseFloat(formAmount);
    const pct = parseFloat(formPct);
    if (!formDate.trim()) {
      setFormError("La fecha es obligatoria.");
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setFormError("El monto debe ser un número positivo.");
      return;
    }
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setFormError("La comisión debe estar entre 0 y 100.");
      return;
    }
    setFormLoading(true);
    try {
      await createDeposit({ date: formDate, amount, commission_pct: pct });
      setFormAmount("");
      setFormPct("0");
      mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo crear el depósito.");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (d: Deposit) => {
    setEditing(d);
    setEditDate(d.date);
    setEditAmount(String(d.amount));
    setEditPct(String(d.commission_pct));
    setEditError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError(null);
    setEditLoading(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    const amount = parseFloat(editAmount);
    const pct = parseFloat(editPct);
    if (!editDate.trim()) {
      setEditError("La fecha es obligatoria.");
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setEditError("El monto debe ser un número positivo.");
      return;
    }
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setEditError("La comisión debe estar entre 0 y 100.");
      return;
    }
    setEditLoading(true);
    try {
      await updateDeposit(editing.id, {
        date: editDate,
        amount,
        commission_pct: pct,
      });
      closeEdit();
      mutate();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDeposit(id);
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const previewAmount = parseFloat(formAmount);
  const previewPct = parseFloat(formPct);
  const previewTotal =
    !Number.isNaN(previewAmount) &&
    previewAmount > 0 &&
    !Number.isNaN(previewPct) &&
    previewPct >= 0
      ? computeTotal(previewAmount, previewPct)
      : null;

  useEffect(() => {
    if (fxRate?.rate) setUsdToGtqRate(fxRate.rate);
  }, [fxRate?.rate]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        onRefresh={() => mutate()}
        isRefreshing={isLoading}
        fxRateLabel={fxRate?.rate ? formatNumber(fxRate.rate, 4) : undefined}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-8">
        <div>
          <h1 className="text-xl font-bold text-foreground">Depósitos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra ingresos a tu cuenta. El total incluye el monto más la comisión en dinero
            (monto × % comisión).
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-destructive">
            {error instanceof Error ? error.message : "Error al cargar depósitos"}
          </div>
        ) : isLoading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <form
              onSubmit={handleCreate}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nuevo depósito
              </h2>
              {formError && (
                <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="dep-date"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Fecha
                  </label>
                  <input
                    id="dep-date"
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dep-amount"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Monto (USD)
                  </label>
                  <input
                    id="dep-amount"
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    step="any"
                    min="0"
                    placeholder="0.00"
                    className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dep-pct"
                    className="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    Comisión %
                  </label>
                  <input
                    id="dep-pct"
                    type="number"
                    value={formPct}
                    onChange={(e) => setFormPct(e.target.value)}
                    step="any"
                    min="0"
                    max="100"
                    className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-xs text-muted-foreground mb-1">Total estimado</p>
                  <p className="font-mono text-base font-semibold text-foreground">
                    {previewTotal != null
                      ? formatCurrency(previewTotal, "USD")
                      : "—"}
                  </p>
                  {previewTotal != null && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatCurrency(convertUsdToGtq(previewTotal), "GTQ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
                >
                  {formLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Registrar
                </button>
              </div>
            </form>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Comisión %
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Comisión $
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!deposits?.length ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-12 text-center text-sm text-muted-foreground"
                        >
                          No hay depósitos registrados.
                        </td>
                      </tr>
                    ) : (
                      deposits.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-border last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                            {d.date}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            <div>{formatCurrency(d.amount, "USD")}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(convertUsdToGtq(d.amount), "GTQ")}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatNumber(d.commission_pct, 4)}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            <div>{formatCurrency(d.commission_amount, "USD")}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(convertUsdToGtq(d.commission_amount), "GTQ")}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-medium">
                            <div>{formatCurrency(d.total, "USD")}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatCurrency(convertUsdToGtq(d.total), "GTQ")}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(d)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
                                aria-label="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(d.id)}
                                disabled={deletingId === d.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                aria-label="Eliminar"
                              >
                                {deletingId === d.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {editing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Editar depósito</h3>
              <button
                type="button"
                onClick={closeEdit}
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
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Fecha
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Monto
                  </label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    step="any"
                    min="0"
                    className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Comisión %
                  </label>
                  <input
                    type="number"
                    value={editPct}
                    onChange={(e) => setEditPct(e.target.value)}
                    step="any"
                    min="0"
                    max="100"
                    className="w-full rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-1.5 text-xs font-medium text-background",
                  "hover:opacity-90 disabled:opacity-50"
                )}
              >
                {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
