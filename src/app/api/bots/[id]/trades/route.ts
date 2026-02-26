// Fetches per-bot trades directly from https://api.simmer.markets using each bot's API key.
import { NextResponse } from "next/server";
import { simmerGet, isOffline } from "@/lib/vps";
import type { OwnerId } from "@/lib/owners";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await simmerGet(id as OwnerId, "/api/sdk/trades?limit=200&venue=polymarket");
    return NextResponse.json(data);
  } catch (e) {
    const offline = isOffline(e);
    return NextResponse.json(
      { error: String(e), offline },
      { status: offline ? 503 : 502 }
    );
  }
}
