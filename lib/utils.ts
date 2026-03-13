import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const USD_TO_GTQ = 7.8;

export function convertUsdToGtq(value: number): number {
  return value * USD_TO_GTQ;
}

export type SupportedCurrency = "USD" | "GTQ";

export function formatCurrency(
  value: number,
  currency: SupportedCurrency = "USD",
  decimals: number = 4
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "GTQ",
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 4): string {
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
  if (prices[ticker] != null && !Number.isNaN(prices[ticker])) {
    return prices[ticker];
  }
  const upper = ticker.toUpperCase();
  if (prices[upper] != null && !Number.isNaN(prices[upper])) {
    return prices[upper];
  }
  return fallback;
}
