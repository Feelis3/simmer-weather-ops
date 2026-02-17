import { NextResponse } from "next/server";
import { getVPSExecutions } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await getVPSExecutions();
    // Limit to most recent 150 to prevent huge payloads (VPS can have 2000+)
    const executions = all.slice(-150);
    return NextResponse.json({ executions, timestamp: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e), executions: [], timestamp: Date.now() });
  }
}
