import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DISCORD_APPLICATION_ID = "1568740982042787840";
const DISCORD_REDIRECT_URI =
  "https://animeteal.vercel.app/api/discord/rpc/callback";
const ANIMETEAL_ORIGIN = "https://animeteal.vercel.app";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== ANIMETEAL_ORIGIN) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientSecret) {
    return NextResponse.json(
      { error: "Discord Rich Presence is not configured yet. The site administrator must add DISCORD_CLIENT_SECRET." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: {
    grantType?: string;
    code?: string;
    refreshToken?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const grantType = body.grantType;
  if (grantType !== "authorization_code" && grantType !== "refresh_token") {
    return NextResponse.json({ error: "Unsupported Discord token grant." }, { status: 400 });
  }

  if (grantType === "authorization_code" && (!body.code || body.code.length > 4096)) {
    return NextResponse.json({ error: "Missing or invalid authorization code." }, { status: 400 });
  }

  if (grantType === "refresh_token" && (!body.refreshToken || body.refreshToken.length > 4096)) {
    return NextResponse.json({ error: "Missing or invalid refresh token." }, { status: 400 });
  }

  const parameters = new URLSearchParams({
    client_id: DISCORD_APPLICATION_ID,
    client_secret: clientSecret,
    grant_type: grantType,
    redirect_uri: DISCORD_REDIRECT_URI,
  });

  if (grantType === "authorization_code") {
    parameters.set("code", body.code!);
  } else {
    parameters.set("refresh_token", body.refreshToken!);
  }

  try {
    const discordResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parameters.toString(),
      cache: "no-store",
    });

    const result = await discordResponse.json().catch(() => ({}));
    if (!discordResponse.ok) {
      return NextResponse.json(
        { error: result.error_description || result.message || "Discord rejected the token exchange." },
        { status: discordResponse.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_in: result.expires_in,
        scope: result.scope,
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not reach Discord's token service." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
