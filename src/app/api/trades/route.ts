import { NextResponse } from "next/server";
import { getPolymarketActivity } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const activity = await getPolymarketActivity(500);
    return NextResponse.json({
      activity,
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), activity: [] }, { status: 500 });
  }
}
