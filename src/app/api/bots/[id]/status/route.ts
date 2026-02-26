// Fetches per-bot status directly from https://api.simmer.markets using each bot's API key.
// The VPS (194.163.160.76:8420) has Marcos's key hardcoded — bypassing it here.
import { NextResponse } from "next/server";
import { simmerGet, isOffline } from "@/lib/vps";
import type { OwnerId } from "@/lib/owners";
import type { Portfolio, PositionsResponse, StatusResponse, AccountInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Fetch portfolio + positions in parallel from Simmer API (each bot's own key)
    const [portfolio, positions] = await Promise.all([
      simmerGet<Portfolio>(id as OwnerId, "/api/sdk/portfolio"),
      simmerGet<PositionsResponse>(id as OwnerId, "/api/sdk/positions"),
    ]);

    // Build AccountInfo from what Simmer SDK provides
    const account: AccountInfo = {
      agent_id:             positions.agent_id,
      name:                 positions.agent_name,
      description:          "",
      status:               "active",
      balance:              portfolio.balance_usdc,
      sim_pnl:              positions.sim_pnl,
      total_pnl:            positions.polymarket_pnl,
      total_pnl_percent:    0,
      trades_count:         0,   // fetched separately via /trades
      win_count:            0,
      loss_count:           0,
      win_rate:             null,
      claimed:              true,
      real_trading_enabled: true,
      created_at:           "",
      last_trade_at:        null,
      polymarket_pnl:       positions.polymarket_pnl,
    };

    const data: StatusResponse = {
      timestamp: new Date().toISOString(),
      account,
      portfolio,
      positions,
    };

    return NextResponse.json(data);
  } catch (e) {
    const offline = isOffline(e);
    return NextResponse.json(
      { error: String(e), offline },
      { status: offline ? 503 : 502 }
    );
  }
}
