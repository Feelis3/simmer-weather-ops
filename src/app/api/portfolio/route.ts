import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPortfolio();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
