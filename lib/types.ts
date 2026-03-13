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
  investments: Investment[];
}

export interface InvestmentCreate {
  ticker: string;
  amount: number;
  buy_price: number;
}
