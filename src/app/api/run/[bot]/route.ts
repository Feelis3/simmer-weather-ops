import { NextResponse } from "next/server";
import { runBot } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ bot: string }> }
) {
  try {
    const { bot } = await params;
    const data = await runBot(bot);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
