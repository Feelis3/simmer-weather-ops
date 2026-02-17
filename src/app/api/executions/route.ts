import { NextResponse } from "next/server";
import { getVPSExecutions } from "@/lib/api";

export const dynamic = "force-dynamic";

// Only load the last N executions to avoid sending megabytes of data
const MAX_EXECUTIONS = 150;

export async function GET() {
  try {
    const allExecutions = await getVPSExecutions();
    // Take only the most recent executions
    const executions = allExecutions.slice(-MAX_EXECUTIONS);
    return NextResponse.json({
      executions,
      total: allExecutions.length,
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), executions: [], total: 0, timestamp: Date.now() });
  }
}
