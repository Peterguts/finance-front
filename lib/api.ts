import type {
  Deposit,
  DepositCreate,
  Investment,
  InvestmentCreate,
  Movement,
  PortfolioSummary,
  Sale,
  SaleCreate,
  SimulatorAsset,
  SimulatorHistoryPoint,
  SimulatorScenarioResult,
} from "./types";

const API_BASE =
  typeof process.env.NEXT_PUBLIC_API_URL === "string" &&
  process.env.NEXT_PUBLIC_API_URL.length > 0
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "/api";

const TOKEN_KEY = "finanzas_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
  // Cookie legible por el middleware de Next para proteger rutas
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; samesite=lax`;
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
}

function detailMessage(detail: unknown): string {
  if (detail == null) return "Request failed";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((x) => {
      if (typeof x === "object" && x !== null && "msg" in x) {
        return String((x as { msg: string }).msg);
      }
      return JSON.stringify(x);
    });
    return parts.join("; ") || "Request failed";
  }
  if (typeof detail === "object" && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  return "Request failed";
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    clearToken();
    redirectToLogin();
    throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "An error occurred" }));
    throw new Error(detailMessage((error as { detail?: unknown }).detail));
  }
  return response.json();
}

export async function login(email: string, password: string): Promise<{ email: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ access_token: string; email: string }>(response);
  setToken(data.access_token);
  return { email: data.email };
}

export function logout() {
  clearToken();
  redirectToLogin();
}

export async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const response = await apiFetch(`/portfolio/summary`);
  return handleResponse<PortfolioSummary>(response);
}

export async function fetchInvestments(ticker?: string): Promise<Investment[]> {
  const q = ticker?.trim() ? `?ticker=${encodeURIComponent(ticker.trim())}` : "";
  const response = await apiFetch(`/investments${q}`);
  return handleResponse<Investment[]>(response);
}

export async function createInvestment(data: InvestmentCreate): Promise<Investment> {
  const response = await apiFetch(`/investments`, {
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
  const response = await apiFetch(`/investments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Investment>(response);
}

export async function deleteInvestment(id: string): Promise<void> {
  const response = await apiFetch(`/investments/${id}`, {
    method: "DELETE",
  });
  if (response.status === 401) {
    clearToken();
    redirectToLogin();
    throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete" }));
    throw new Error(detailMessage((error as { detail?: unknown }).detail));
  }
}

export async function fetchPrices(): Promise<Record<string, number>> {
  const response = await apiFetch(`/prices`);
  return handleResponse<Record<string, number>>(response);
}

export async function fetchPrice(ticker: string): Promise<{ ticker: string; price: number }> {
  const response = await apiFetch(`/prices/${encodeURIComponent(ticker)}`);
  return handleResponse<{ ticker: string; price: number }>(response);
}

/**
 * Genera variantes del ticker para APIs que usan formatos distintos
 * (ej. LINKUSD -> LINK-USD, BTCUSD -> BTC-USD).
 */
function getTickerVariants(ticker: string): string[] {
  const variants = [ticker];
  if (/^[A-Z0-9]+USD$/i.test(ticker) && !ticker.includes("-")) {
    const base = ticker.slice(0, -3);
    variants.push(`${base}-USD`);
  }
  if (/^[A-Z0-9]+USDT$/i.test(ticker) && !ticker.includes("-")) {
    const base = ticker.slice(0, -4);
    variants.push(`${base}-USD`, `${base}-USDT`);
  }
  return variants;
}

/**
 * Obtiene el precio de un ticker probando el símbolo y sus variantes (ej. LINKUSD y LINK-USD).
 */
async function fetchPriceWithVariants(
  ticker: string
): Promise<{ ticker: string; price: number } | null> {
  const variants = getTickerVariants(ticker);
  for (const variant of variants) {
    try {
      const result = await fetchPrice(variant);
      if (result?.price != null && !Number.isNaN(result.price)) {
        return { ticker, price: result.price };
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Obtiene el precio actual de cada ticker llamando a /prices/{ticker}.
 * Prueba variantes (ej. LINKUSD -> LINK-USD) por si el backend usa otro formato.
 */
export async function fetchPricesForTickers(
  tickers: string[]
): Promise<Record<string, number>> {
  const unique = [...new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean))];
  if (unique.length === 0) return {};
  const results = await Promise.all(unique.map((ticker) => fetchPriceWithVariants(ticker)));
  const prices: Record<string, number> = {};
  results.forEach((result, i) => {
    const ticker = unique[i];
    if (result?.price != null && !Number.isNaN(result.price)) {
      prices[ticker] = result.price;
    }
  });
  return prices;
}

export async function fetchPricesStatus(): Promise<{ live: boolean }> {
  const response = await fetch(`${API_BASE}/prices/status`);
  return handleResponse<{ live: boolean }>(response);
}

export async function fetchUsdGtqRate(): Promise<{
  pair: string;
  rate: number;
  live: boolean;
  source: string;
  updated_at: string;
}> {
  const response = await fetch(`${API_BASE}/fx/usd-gtq`);
  return handleResponse<{
    pair: string;
    rate: number;
    live: boolean;
    source: string;
    updated_at: string;
  }>(response);
}

export async function fetchSales(params?: {
  ticker?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
}): Promise<Sale[]> {
  const search = new URLSearchParams();
  if (params?.ticker) search.set("ticker", params.ticker);
  if (params?.from_date) search.set("from_date", params.from_date);
  if (params?.to_date) search.set("to_date", params.to_date);
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  const response = await apiFetch(`/sales${qs ? `?${qs}` : ""}`);
  return handleResponse<Sale[]>(response);
}

export async function createSale(data: SaleCreate): Promise<Sale> {
  const response = await apiFetch(`/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Sale>(response);
}

export async function updateSale(
  id: string,
  data: { quantity?: number; sell_price?: number }
): Promise<Sale> {
  const response = await apiFetch(`/sales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Sale>(response);
}

export async function deleteSale(id: string): Promise<void> {
  const response = await apiFetch(`/sales/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete sale" }));
    throw new Error(detailMessage((error as { detail?: unknown }).detail));
  }
}

export async function fetchDeposits(): Promise<Deposit[]> {
  const response = await apiFetch(`/deposits`);
  return handleResponse<Deposit[]>(response);
}

export async function createDeposit(data: DepositCreate): Promise<Deposit> {
  const response = await apiFetch(`/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Deposit>(response);
}

export async function updateDeposit(
  id: string,
  data: Partial<DepositCreate>
): Promise<Deposit> {
  const response = await apiFetch(`/deposits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Deposit>(response);
}

export async function deleteDeposit(id: string): Promise<void> {
  const response = await apiFetch(`/deposits/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Failed to delete" }));
    throw new Error(detailMessage((error as { detail?: unknown }).detail));
  }
}

export async function fetchMovements(params?: {
  ticker?: string;
  from_date?: string;
  to_date?: string;
  type?: "buy" | "sell";
  limit?: number;
}): Promise<Movement[]> {
  const search = new URLSearchParams();
  if (params?.ticker) search.set("ticker", params.ticker);
  if (params?.from_date) search.set("from_date", params.from_date);
  if (params?.to_date) search.set("to_date", params.to_date);
  if (params?.type) search.set("type", params.type);
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  const response = await apiFetch(`/movements${qs ? `?${qs}` : ""}`);
  return handleResponse<Movement[]>(response);
}

export async function fetchSimulatorAssets(): Promise<SimulatorAsset[]> {
  const response = await apiFetch(`/simulator/assets`);
  return handleResponse<SimulatorAsset[]>(response);
}

export async function fetchSimulatorHistory(
  ticker: string,
  params?: { period?: string; interval?: string; limit?: number }
): Promise<SimulatorHistoryPoint[]> {
  const search = new URLSearchParams();
  if (params?.period) search.set("period", params.period);
  if (params?.interval) search.set("interval", params.interval);
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  const response = await apiFetch(
    `/simulator/history/${encodeURIComponent(ticker)}${qs ? `?${qs}` : ""}`
  );
  return handleResponse<SimulatorHistoryPoint[]>(response);
}

export async function simulateScenario(input: {
  ticker: string;
  change_pct: number;
}): Promise<SimulatorScenarioResult> {
  const response = await apiFetch(`/simulator/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return handleResponse<SimulatorScenarioResult>(response);
}
