import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
  createOpaqueToken,
  discordClientId,
  discordRedirectUri,
  hashSecret,
  isAdminDiscordId,
  sessionCookieOptions,
  siteUrl,
} from "@/lib/animeteal-auth";
import { getAnimeTealDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type DiscordProfile = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string;
};

function avatarUrl(profile: DiscordProfile): string {
  if (profile.avatar) {
    const extension = profile.avatar.startsWith("a_") ? "gif" : "png";
    return "https://cdn.discordapp.com/avatars/" + profile.id + "/" + profile.avatar + "." + extension + "?size=256";
  }
  const discriminator = Number(profile.discriminator || 0);
  let index: number;
  if (Number.isFinite(discriminator) && discriminator > 0) {
    index = discriminator % 5;
  } else {
    // Discord snowflakes are larger than Number.MAX_SAFE_INTEGER. Compute
    // floor((id / 2^22) % 6) using decimal-string arithmetic instead of BigInt,
    // keeping compatibility with this project's ES2019 TypeScript target.
    const modulus = 6 * 4194304;
    let remainder = 0;
    for (const digit of profile.id) {
      if (digit < "0" || digit > "9") return "https://cdn.discordapp.com/embed/avatars/0.png";
      remainder = (remainder * 10 + Number(digit)) % modulus;
    }
    index = Math.floor(remainder / 4194304);
  }
  return "https://cdn.discordapp.com/embed/avatars/" + index.toString() + ".png";
}

function loginError(message: string) {
  const url = new URL("/login", siteUrl());
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return loginError("Discord authorization could not be verified. Please try again.");
  }

  try {
    const db = await getAnimeTealDb();
    const stateRecord = await db.collection("oauth_states").findOneAndDelete({
      stateHash: hashSecret(state),
      expiresAt: { $gt: new Date() },
    });

    if (!stateRecord) {
      return loginError("Your Discord login expired. Please try again.");
    }

    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientSecret) {
      return loginError("Discord sign-in is not configured. Contact AnimeTeal support.");
    }

    const tokenBody = new URLSearchParams({
      client_id: discordClientId(),
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: discordRedirectUri(),
    });

    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
      cache: "no-store",
    });
    const tokenResult = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenResult.access_token) {
      console.error("Discord token exchange rejected:", tokenResult.error || tokenResult.message || tokenResponse.status);
      return loginError("Discord could not complete sign-in. Please try again.");
    }

    const profileResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: "Bearer " + tokenResult.access_token },
      cache: "no-store",
    });
    if (!profileResponse.ok) {
      return loginError("AnimeTeal could not retrieve your Discord profile.");
    }

    const profile = await profileResponse.json() as DiscordProfile;
    if (!profile.id || !profile.username) {
      return loginError("Discord returned an incomplete profile.");
    }

    const now = new Date();
    const admin = isAdminDiscordId(profile.id);
    await db.collection("users").updateOne(
      { discordId: profile.id },
      {
        $set: {
          username: profile.username,
          displayName: profile.global_name?.trim() || profile.username,
          avatarUrl: avatarUrl(profile),
          updatedAt: now,
          lastLoginAt: now,
          lastSeenAt: now,
          lastPlatform: stateRecord.platform === "android" ? "android" : "web",
          role: admin ? "admin" : "user",
        },
        $setOnInsert: {
          discordId: profile.id,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const user = await db.collection("users").findOne({ discordId: profile.id });
    if (!user) return loginError("Your AnimeTeal account could not be created.");

    if (stateRecord.platform === "android") {
      const ticket = createOpaqueToken();
      await db.collection("auth_tickets").insertOne({
        ticketHash: hashSecret(ticket),
        discordId: profile.id,
        codeChallenge: stateRecord.codeChallenge,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 2 * 60 * 1000),
      });

      const deepLink = new URL("animeteal://auth");
      deepLink.searchParams.set("ticket", ticket);
      const response = NextResponse.redirect(deepLink);
      response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    const sessionToken = createOpaqueToken();
    await db.collection("sessions").insertOne({
      tokenHash: hashSecret(sessionToken),
      discordId: profile.id,
      platform: "web",
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });

    const response = NextResponse.redirect(new URL("/", siteUrl()));
    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    response.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("Discord OAuth callback failed:", error);
    return loginError("AnimeTeal could not finish signing you in. Please try again.");
  }
}
