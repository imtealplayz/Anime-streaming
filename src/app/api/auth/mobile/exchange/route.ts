import { NextRequest, NextResponse } from "next/server";
import {
  createOpaqueToken,
  hashSecret,
  pkceChallenge,
  publicUser,
} from "@/lib/animeteal-auth";
import { getAnimeTealDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ticket = typeof body.ticket === "string" ? body.ticket : "";
    const verifier = typeof body.codeVerifier === "string" ? body.codeVerifier : "";

    if (ticket.length < 32 || ticket.length > 256 || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
      return NextResponse.json({ error: "Invalid login ticket." }, { status: 400 });
    }

    const db = await getAnimeTealDb();
    const authTicket = await db.collection("auth_tickets").findOneAndDelete({
      ticketHash: hashSecret(ticket),
      codeChallenge: pkceChallenge(verifier),
      expiresAt: { $gt: new Date() },
    });

    if (!authTicket) {
      return NextResponse.json(
        { error: "This login link expired or was already used. Please sign in again." },
        { status: 401 },
      );
    }

    const user = await db.collection("users").findOne({ discordId: authTicket.discordId });
    if (!user) return NextResponse.json({ error: "AnimeTeal account not found." }, { status: 404 });

    const accessToken = createOpaqueToken();
    const now = new Date();
    await db.collection("sessions").insertOne({
      tokenHash: hashSecret(accessToken),
      discordId: user.discordId,
      platform: "android",
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json(
      {
        accessToken,
        user: {
          discordId: user.discordId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isAdmin: (process.env.ADMIN_DISCORD_IDS || "").split(",").map((v: string) => v.trim()).includes(user.discordId),
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Android session exchange failed:", error);
    return NextResponse.json(
      { error: "AnimeTeal account storage is not connected. Configure MONGODB_URI in Vercel." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
