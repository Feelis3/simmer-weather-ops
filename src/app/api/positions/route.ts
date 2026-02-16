import { NextResponse } from "next/server";
import { getSimmerPositions, getPolymarketPositions } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [simmer, polymarket] = await Promise.allSettled([
      getSimmerPositions(),
      getPolymarketPositions(),
    ]);

    return NextResponse.json({
      simmer: simmer.status === "fulfilled" ? simmer.value : null,
      polymarket: polymarket.status === "fulfilled" ? polymarket.value : [],
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
