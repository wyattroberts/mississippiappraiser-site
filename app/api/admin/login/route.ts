import { NextRequest, NextResponse } from "next/server";
import { createAdminSession, hasAdminConfiguration, passwordMatches, sameOrigin, setSessionCookie } from "@/lib/admin-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!hasAdminConfiguration()) {
    return NextResponse.json({ error: "Blog publishing has not been configured yet." }, { status: 503 });
  }

  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const existing = attempts.get(key);
  const record = !existing || existing.resetAt < now ? { count: 0, resetAt: now + 15 * 60_000 } : existing;
  if (record.count >= 8) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  const payload = await request.json().catch(() => ({})) as { password?: unknown };
  if (!await passwordMatches(String(payload.password || ""))) {
    record.count += 1;
    attempts.set(key, record);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  attempts.delete(key);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, await createAdminSession());
  return response;
}
