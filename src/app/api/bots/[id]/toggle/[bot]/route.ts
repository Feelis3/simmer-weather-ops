import { NextResponse } from "next/server";
import { vpsPost, isOffline } from "@/lib/vps";
import type { OwnerId } from "@/lib/owners";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; bot: string }> }
) {
  const { id, bot } = await params;
  try {
    const body = await request.json();
    const data = await vpsPost(id as OwnerId, `/api/toggle/${bot}`, body);
    return NextResponse.json(data);
  } catch (e) {
    const offline = isOffline(e);
    return NextResponse.json({ error: String(e), offline }, { status: offline ? 503 : 502 });
  }
}
