// ============ Portfolio ============

export interface Portfolio {
  balance_usdc: number;
  total_exposure: number;
  positions_count: number;
  pnl_24h: number | null;
  pnl_total: number;
  concentration: {
    top_market_pct: number;
    top_3_markets_pct: number;
  };
  by_source: Record<string, { positions?: number; exposure?: number; pnl?: number }>;
}

// ============ Positions ============

export interface Position {
  market_id: string;
  question: string;
  shares_yes: number;
  shares_no: number;
  sim_balance?: number;
  current_price: number;
  current_probability?: number;
  current_value: number;
  cost_basis: number;
  avg_cost: number;
  pnl: number;
  status?: string;
  resolves_at: string;
  venue: "simmer" | "polymarket";
  currency: "$SIM" | "USDC";
  sources: string[];
  redeemable?: boolean;
  redeemable_side?: string | null;
}

export interface PositionsResponse {
  agent_id: string;
  agent_name: string;
  positions: Position[];
  total_value: number;
  sim_pnl: number;
  polymarket_pnl: number;
}

// ============ Trades ============

export interface Trade {
  id: string;
  agent_id: string | null;
  agent_name: string | null;
  market_id: string;
  market_question: string;
  side: string;
  action: string;
  shares: number;
  cost: number;
  price_before: number;
  price_after: number;
  created_at: string;
  venue: string;
  source: string;
  reasoning: string | null;
}

export interface TradesResponse {
  trades: Trade[];
}

// ============ Markets ============

export interface MarketItem {
  id: string;
  question: string;
  status: string;
  url: string;
  current_probability: number;
  current_price: number;
  import_source: string;
  external_price_yes: number;
  divergence: number;
  opportunity_score: number;
  resolves_at: string;
  is_sdk_only: boolean;
  outcome: boolean | null;
  tags: string;
  volume_24h: number;
  is_paid: boolean;
}

export interface MarketsResponse {
  markets: MarketItem[];
}

// ============ BTC ============

export interface BtcData {
  price: number;
  change_24h: number;
  volume_24h: number;
}

// ============ Leaderboard ============

export interface LeaderboardData {
  total_pnl: number;
  pnl_percent: number;
  win_rate: number;
  rank: number;
  total_agents: number;
}

// ============ Crons ============

export interface BotCron {
  active: boolean;
  cron: string;
}

export interface CronsResponse {
  crontab: string;
  bots: Record<string, BotCron>;
}

// ============ Logs ============

export interface LogResponse {
  bot: string;
  log: string;
}

// ============ Status (all-in-one) ============

export interface AccountInfo {
  agent_id: string;
  name: string;
  description: string;
  status: string;
  balance: number;
  sim_pnl: number;
  total_pnl: number;
  total_pnl_percent: number;
  trades_count: number;
  win_count: number;
  loss_count: number;
  win_rate: number | null;
  claimed: boolean;
  real_trading_enabled: boolean;
  created_at: string;
  last_trade_at: string | null;
}

export interface StatusResponse {
  timestamp: string;
  account: AccountInfo;
  portfolio: Portfolio;
  positions: PositionsResponse;
}
