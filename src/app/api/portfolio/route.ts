import { NextResponse } from "next/server";
import { getPolymarketValue, getPolymarketPositions } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [pmValue, pmPositions] = await Promise.allSettled([
      getPolymarketValue(),
      getPolymarketPositions(),
    ]);

    const positions = pmPositions.status === "fulfilled" ? pmPositions.value : [];
    const portfolioValue = pmValue.status === "fulfilled" ? pmValue.value : 0;

    // Calculate real P&L from positions
    const totalPnl = positions.reduce((sum, p) => sum + (p.cashPnl ?? 0), 0);
    const totalExposure = positions.reduce((sum, p) => sum + (p.currentValue ?? 0), 0);

    return NextResponse.json({
      portfolio_value: portfolioValue,
      total_pnl: totalPnl,
      total_exposure: totalExposure,
      positions_count: positions.length,
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
