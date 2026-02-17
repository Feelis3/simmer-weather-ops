import { NextResponse } from "next/server";
import { getSimmerBriefing } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const briefing = await getSimmerBriefing();
    return NextResponse.json({ briefing, timestamp: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e), briefing: null, timestamp: Date.now() });
  }
}
