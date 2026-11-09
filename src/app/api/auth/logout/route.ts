import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  revokeRequestSession,
} from "@/lib/animeteal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await revokeRequestSession(request);
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("AnimeTeal logout failed:", error);
    const response = NextResponse.json({ error: "Could not sign out right now." }, { status: 503 });
    clearSessionCookie(response);
    return response;
  }
}
