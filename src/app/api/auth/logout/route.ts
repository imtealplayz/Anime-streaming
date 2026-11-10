import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  getAuthenticatedUser,
  revokeRequestSession,
} from "@/lib/animeteal-auth";
import { getAnimeTealDb } from "@/lib/mongodb";
import { recordAuditEvent } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    await revokeRequestSession(request);

    if (user) {
      const db = await getAnimeTealDb();
      await recordAuditEvent(db, request, {
        eventType: "auth.logout",
        actor: {
          discordId: user.discordId,
          username: user.username,
          displayName: user.displayName,
        },
        platform: user.lastPlatform,
      });
    }

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
