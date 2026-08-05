import { NextRequest, NextResponse } from "next/server";
import { hasAdminConfiguration, isAdmin } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: await isAdmin(request), configured: hasAdminConfiguration() });
}
