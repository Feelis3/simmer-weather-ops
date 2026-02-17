import { NextResponse } from "next/server";
import { getPolymarketPositions } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const positions = await getPolymarketPositions();
    return NextResponse.json({
      positions,
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), positions: [] }, { status: 500 });
  }
}
