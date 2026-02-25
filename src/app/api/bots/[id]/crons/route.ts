import { NextResponse } from "next/server";
import { vpsGet, isOffline } from "@/lib/vps";
import type { OwnerId } from "@/lib/owners";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await vpsGet(id as OwnerId, "/api/crons");
    return NextResponse.json(data);
  } catch (e) {
    const offline = isOffline(e);
    return NextResponse.json({ error: String(e), offline }, { status: offline ? 503 : 502 });
  }
}
