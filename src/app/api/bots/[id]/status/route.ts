// Fetches per-bot status directly from https://api.simmer.markets using each bot's API key.
// Falls back to VPS /api/status if Simmer is unreachable (VPS only has Marcos's data).
import { NextResponse } from "next/server";
import { simmerGet, vpsGet, isOffline } from "@/lib/vps";
import type { OwnerId } from "@/lib/owners";
import type { Portfolio, PositionsResponse, StatusResponse, AccountInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Primary: Simmer API (per-bot data) ──────────────────────────────────────
  try {
    const [portfolio, positions] = await Promise.all([
      simmerGet<Portfolio>(id as OwnerId, "/api/sdk/portfolio"),
      simmerGet<PositionsResponse>(id as OwnerId, "/api/sdk/positions"),
    ]);

    const account: AccountInfo = {
      agent_id:             positions.agent_id,
      name:                 positions.agent_name,
      description:          "",
      status:               "active",
      balance:              portfolio.balance_usdc,
      sim_pnl:              positions.sim_pnl,
      total_pnl:            positions.polymarket_pnl,
      total_pnl_percent:    0,
      trades_count:         0,
      win_count:            0,
      loss_count:           0,
      win_rate:             null,
      claimed:              true,
      real_trading_enabled: true,
      created_at:           "",
      last_trade_at:        null,
      polymarket_pnl:       positions.polymarket_pnl,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      account,
      portfolio,
      positions,
    } satisfies StatusResponse);

  } catch (_simmerErr) {
    // ── Fallback: VPS (Marcos-only, kept alive while Simmer is unreachable) ───
    try {
      const data = await vpsGet<StatusResponse>(id as OwnerId, "/api/status");
      return NextResponse.json(data);
    } catch (e) {
      const offline = isOffline(e);
      return NextResponse.json(
        { error: String(e), offline },
        { status: offline ? 503 : 502 }
      );
    }
  }
}
