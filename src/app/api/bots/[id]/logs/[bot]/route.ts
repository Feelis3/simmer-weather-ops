import { NextResponse } from "next/server";
import { vpsGet, isOffline } from "@/lib/vps";
import type { OwnerId } from "@/lib/owners";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; bot: string }> }
) {
  const { id, bot } = await params;
  const url = new URL(request.url);
  const lines = url.searchParams.get("lines") ?? "100";
  try {
    const data = await vpsGet(id as OwnerId, `/api/logs/${bot}?lines=${lines}`);
    return NextResponse.json(data);
  } catch (e) {
    const offline = isOffline(e);
    return NextResponse.json({ error: String(e), offline }, { status: offline ? 503 : 502 });
  }
}
