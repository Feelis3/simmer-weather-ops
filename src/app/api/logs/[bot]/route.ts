import { NextResponse } from "next/server";
import { getLogs } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bot: string }> }
) {
  try {
    const { bot } = await params;
    const url = new URL(request.url);
    const lines = parseInt(url.searchParams.get("lines") || "100", 10);
    const data = await getLogs(bot, lines);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
