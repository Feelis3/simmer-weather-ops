import { NextResponse } from "next/server";
import { getVPSExecutions } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const executions = await getVPSExecutions();
    return NextResponse.json({ executions, timestamp: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e), executions: [], timestamp: Date.now() });
  }
}
