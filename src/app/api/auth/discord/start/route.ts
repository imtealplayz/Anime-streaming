import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  discordClientId,
  discordRedirectUri,
  hashSecret,
} from "@/lib/animeteal-auth";
import { getAnimeTealDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const client = request.nextUrl.searchParams.get("client") === "android" ? "android" : "web";
    const challenge = request.nextUrl.searchParams.get("code_challenge") || "";

    if (client === "android" && !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)) {
      return NextResponse.json(
        { error: "The Android login challenge is missing or invalid." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const state = randomBytes(32).toString("base64url");
    const db = await getAnimeTealDb();
    await db.collection("oauth_states").insertOne({
      stateHash: hashSecret(state),
      platform: client,
      codeChallenge: client === "android" ? challenge : null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const authorize = new URL("https://discord.com/oauth2/authorize");
    authorize.searchParams.set("client_id", discordClientId());
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("scope", "identify");
    authorize.searchParams.set("redirect_uri", discordRedirectUri());
    authorize.searchParams.set("state", state);

    const response = NextResponse.redirect(authorize);
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Discord OAuth start failed:", error);
    return NextResponse.json(
      { error: "AnimeTeal account storage is not connected yet. Configure MONGODB_URI in Vercel." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
