export interface Investment {
  id: string;
  ticker: string;
  amount: number;
  buy_price: number;
  timestamp: string;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_pnl: number;
  pnl_percentage: number;
  total_realized_pnl?: number;
  total_unrealized_pnl?: number;
  investments: Investment[];
  positions?: PortfolioPosition[];
}

export interface PortfolioPosition {
  ticker: string;
  quantity: number;
  cost_basis: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export interface InvestmentCreate {
  ticker: string;
  amount: number;
  buy_price: number;
}

export interface Sale {
  id: string;
  ticker: string;
  quantity: number;
  sell_price: number;
  date: string;
  cost_basis: number;
  realized_pnl: number;
  created_at: string;
}

export interface SaleCreate {
  ticker: string;
  quantity: number;
  sell_price: number;
}

export interface Movement {
  id: string;
  type: "buy" | "sell";
  ticker: string;
  quantity: number;
  price: number;
  amount: number;
  date: string;
  created_at: string;
  realized_pnl: number | null;
}
