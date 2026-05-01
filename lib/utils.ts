import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_USD_TO_GTQ =
  Number.parseFloat(process.env.NEXT_PUBLIC_USD_TO_GTQ_RATE || "") || 7.75;
let usdToGtqRate = DEFAULT_USD_TO_GTQ;

export function convertUsdToGtq(value: number): number {
  return value * usdToGtqRate;
}

export function setUsdToGtqRate(rate: number): void {
  if (Number.isFinite(rate) && rate > 0) {
    usdToGtqRate = rate;
  }
}

export type SupportedCurrency = "USD" | "GTQ";

export function formatCurrency(
  value: number,
  currency: SupportedCurrency = "USD",
  decimals: number = 2
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "GTQ",
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 6): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Obtiene el precio actual de un ticker desde el objeto de precios.
 * Prueba con el ticker tal cual y en mayúsculas por si el backend devuelve claves distintas.
 * Si no hay precio, usa el fallback (ej. precio de compra).
 */
export function getCurrentPrice(
  prices: Record<string, number>,
  ticker: string,
  fallback: number
): number {
  const canon = normalizeTicker(ticker);
  if (prices[ticker] != null && !Number.isNaN(prices[ticker])) {
    return prices[ticker];
  }
  if (prices[canon] != null && !Number.isNaN(prices[canon])) {
    return prices[canon];
  }
  const upper = ticker.toUpperCase();
  if (prices[upper] != null && !Number.isNaN(prices[upper])) {
    return prices[upper];
  }
  return fallback;
}

/** Alineado con el backend: un solo símbolo para LINK. */
export function normalizeTicker(ticker: string): string {
  const t = (ticker || "").trim().toUpperCase();
  if (t === "LINKUSD" || t === "LINK-USD" || t === "LINK") return "LINK-USD";
  return t;
}
