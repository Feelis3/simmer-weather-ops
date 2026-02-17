import { NextResponse } from "next/server";
import { getSimmerPortfolio, getPolymarketValue } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [simmer, pmValue] = await Promise.allSettled([
      getSimmerPortfolio(),
      getPolymarketValue(),
    ]);

    return NextResponse.json({
      simmer: simmer.status === "fulfilled" ? simmer.value : null,
      polymarket_value: pmValue.status === "fulfilled" ? pmValue.value : 0,
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
