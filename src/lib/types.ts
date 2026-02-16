// Simmer API types
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
  by_source: Record<string, unknown>;
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
  avg_price: number;
  current_price: number;
  pnl: number;
  source: string;
}

export interface SimmerTrades {
  trades: SimmerTrade[];
  total_count: number;
}

export interface SimmerTrade {
  id: string;
  market_id: string;
  title: string;
  side: string;
  amount: number;
  price: number;
  shares: number;
  timestamp: string;
  source: string;
}

// Polymarket types
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

export interface PolymarketTrade {
  proxyWallet: string;
  side: string;
  asset: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  icon: string;
  eventSlug: string;
  outcome: string;
  outcomeIndex: number;
  name: string;
  pseudonym: string;
  transactionHash: string;
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

// Gamma API types
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

// Dashboard combined types
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
