// ============ Simmer API types ============

export interface SimmerPortfolio {
  balance_usdc: number;
  total_exposure: number;
  positions_count: number;
  pnl_24h: number | null;
  pnl_total: number;
  concentration: {
    top_market_pct: number;
    top_3_markets_pct: number;
  };
  by_source: Record<string, SourcePnl>;
}

export interface SourcePnl {
  pnl: number;
  positions: number;
  trades: number;
}

export interface SimmerPositions {
  agent_id: string;
  agent_name: string;
  positions: SimmerPosition[];
  total_value: number;
  sim_pnl: number;
  polymarket_pnl: number;
}

export interface SimmerPosition {
  market_id: string;
  title: string;
  side: string;
  shares: number;
  shares_yes?: number;
  shares_no?: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  source: string;
  venue?: string;
}

export interface SimmerTrades {
  trades: SimmerTrade[];
  total_count: number;
}

export interface SimmerTrade {
  id: string;
  market_id: string;
  title: string;
  market_question?: string;
  side: string;
  action?: string;
  amount: number;
  cost?: number;
  price: number;
  shares: number;
  timestamp: string;
  created_at?: string;
  source: string;
  venue?: string;
  reasoning?: string;
}

// ============ Simmer Briefing ============

export interface SimmerBriefing {
  portfolio: SimmerPortfolio;
  positions: SimmerPosition[];
  opportunities: {
    high_divergence: DivergenceOpportunity[];
  };
  risk_alerts: RiskAlert[];
  performance: PerformanceSummary;
}

export interface DivergenceOpportunity {
  market_id: string;
  market_question: string;
  simmer_price: number;
  external_price: number;
  divergence: number;
  signal_freshness: string;
  direction?: string;
}

export interface RiskAlert {
  type: string;
  message: string;
  severity: string;
}

export interface PerformanceSummary {
  total_trades: number;
  win_rate: number;
  avg_return: number;
  best_trade: number;
  worst_trade: number;
}

// ============ Simmer Markets ============

export interface SimmerMarket {
  id: string;
  question: string;
  status: string;
  volume: number;
  source: string;
  simmer_price?: number;
  external_price?: number;
}

// ============ Polymarket types ============

export interface PolymarketPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  percentRealizedPnl: number;
  curPrice: number;
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon: string;
  eventId: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  oppositeOutcome: string;
  oppositeAsset: string;
  endDate: string;
  negativeRisk: boolean;
}

export interface PolymarketActivity {
  proxyWallet: string;
  timestamp: number;
  conditionId: string;
  type: "TRADE" | "REDEEM" | "MERGE";
  size: number;
  usdcSize: number;
  transactionHash: string;
  price: number;
  asset: string;
  side: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
}

// ============ Gamma API types ============

export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  volume: number;
  markets: GammaMarket[];
}

export interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string;
  volume: number;
  active: boolean;
  closed: boolean;
  groupItemTitle: string;
  clobTokenIds: string;
}

// ============ Dashboard combined types ============

export interface WeatherMarketData {
  city: string;
  eventSlug: string;
  eventTitle: string;
  volume: number;
  endDate: string;
  buckets: TempBucket[];
}

export interface TempBucket {
  label: string;
  marketId: string;
  conditionId: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
}

// ============ Strategy constants ============

export const STRATEGIES = {
  WEATHER: "sdk:weather",
  COPYTRADING: "sdk:copytrading",
  AI_DIVERGENCE: "sdk:ai-divergence",
} as const;

export type StrategyKey = keyof typeof STRATEGIES;

export const STRATEGY_LABELS: Record<string, string> = {
  "sdk:weather": "Weather",
  "sdk:copytrading": "Copytrading",
  "sdk:ai-divergence": "AI Divergence",
};

export const STRATEGY_COLORS: Record<string, string> = {
  "sdk:weather": "#00ff41",
  "sdk:copytrading": "#00ffff",
  "sdk:ai-divergence": "#8b5cf6",
};

export const COPYTRADING_WALLETS = [
  "0x38e59b36aae31b164200d0cad7c3fe5e0ee795e7",
  "0x4762c329459b5bbf87e9fc9f65749efc7086ba70",
  "0xa0f8b626bf42c179ccfb8abd67aba00f1363b80d",
];
