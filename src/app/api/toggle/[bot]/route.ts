import { NextResponse } from "next/server";
import { toggleBot } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bot: string }> }
) {
  try {
    const { bot } = await params;
    const body = await request.json();
    const data = await toggleBot(bot, body.enabled);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
