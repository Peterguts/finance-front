import type { Investment, InvestmentCreate, PortfolioSummary } from "./types";

const API_BASE =
  typeof process.env.NEXT_PUBLIC_API_URL === "string" &&
  process.env.NEXT_PUBLIC_API_URL.length > 0
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "An error occurred" }));
    throw new Error(error.detail || "Request failed");
  }
  return response.json();
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const response = await fetch(`${API_BASE}/portfolio/summary`);
  return handleResponse<PortfolioSummary>(response);
}

export async function fetchInvestments(): Promise<Investment[]> {
  const response = await fetch(`${API_BASE}/investments`);
  return handleResponse<Investment[]>(response);
}

export async function createInvestment(data: InvestmentCreate): Promise<Investment> {
  const response = await fetch(`${API_BASE}/investments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Investment>(response);
}

export async function updateInvestment(
  id: string,
  data: Partial<InvestmentCreate>
): Promise<Investment> {
  const response = await fetch(`${API_BASE}/investments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Investment>(response);
}

export async function deleteInvestment(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/investments/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete" }));
    throw new Error(error.detail);
  }
}

export async function fetchPrices(): Promise<Record<string, number>> {
  const response = await fetch(`${API_BASE}/prices`);
  return handleResponse<Record<string, number>>(response);
}

export async function fetchPrice(ticker: string): Promise<{ ticker: string; price: number }> {
  const response = await fetch(`${API_BASE}/prices/${ticker}`);
  return handleResponse<{ ticker: string; price: number }>(response);
}

export async function fetchPricesStatus(): Promise<{ live: boolean }> {
  const response = await fetch(`${API_BASE}/prices/status`);
  return handleResponse<{ live: boolean }>(response);
}
