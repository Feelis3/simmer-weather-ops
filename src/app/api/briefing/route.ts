import { NextResponse } from "next/server";
import { getVPSDivergence } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const divergence = await getVPSDivergence();
    return NextResponse.json({ divergence, timestamp: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e), divergence: [], timestamp: Date.now() });
  }
}
