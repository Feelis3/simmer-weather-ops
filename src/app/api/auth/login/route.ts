import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function makeToken(username: string): string {
  // Simple hash: we use a basic approach compatible with Edge runtime
  const secret = process.env.AUTH_SECRET || "fallback_secret";
  const data = `${username}:${secret}`;
  // Create a simple hash using btoa (base64) — sufficient for a private dashboard
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return btoa(`${username}:${Math.abs(hash).toString(36)}`);
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    const validUser = process.env.AUTH_USER || "Marcos";
    const validPass = process.env.AUTH_PASS || "3435";

    if (username !== validUser || password !== validPass) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = makeToken(username);
    const response = NextResponse.json({ ok: true });

    response.cookies.set("clawdbot_session", token, {
      httpOnly: true,
      secure: false, // allow HTTP
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
