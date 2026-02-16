import { NextResponse } from "next/server";
import { getAllWeatherMarkets } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const markets = await getAllWeatherMarkets();
    return NextResponse.json({ markets, timestamp: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
