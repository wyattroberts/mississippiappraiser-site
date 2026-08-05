import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, sameOrigin } from "@/lib/admin-auth";

export function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
