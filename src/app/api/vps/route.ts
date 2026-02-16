import { NextResponse } from "next/server";
import { getVPSPortfolio, getVPSPositions, getVPSTrades, getVPSDivergence } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [portfolio, positions, trades, divergence] = await Promise.allSettled([
      getVPSPortfolio(),
      getVPSPositions(),
      getVPSTrades(),
      getVPSDivergence(),
    ]);

    return NextResponse.json({
      portfolio: portfolio.status === "fulfilled" ? portfolio.value : null,
      positions: positions.status === "fulfilled" ? positions.value : null,
      trades: trades.status === "fulfilled" ? trades.value : null,
      divergence: divergence.status === "fulfilled" ? divergence.value : [],
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
