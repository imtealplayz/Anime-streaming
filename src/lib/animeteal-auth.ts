import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getAnimeTealDb } from "@/lib/mongodb";

export const SESSION_COOKIE = "animeteal_session";
export const OAUTH_STATE_COOKIE = "animeteal_oauth_state";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type AnimeTealUser = {
  discordId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  createdAt: Date;
  lastLoginAt?: Date;
  lastSeenAt?: Date;
  lastPlatform?: "web" | "android";
  isAdmin: boolean;
};

export function hashSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function discordClientId(): string {
  return process.env.DISCORD_CLIENT_ID || "1568740982042787840";
}

export function discordRedirectUri(): string {
  return process.env.DISCORD_REDIRECT_URI ||
    "https://animeteal.vercel.app/api/auth/discord/callback";
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://animeteal.vercel.app").replace(/\/$/, "");
}

export function adminDiscordIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_DISCORD_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function isAdminDiscordId(discordId: string): boolean {
  return adminDiscordIds().has(discordId);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

export type SessionPlatform = "web" | "android";

export async function createUserSession(discordId: string, platform: SessionPlatform) {
  const db = await getAnimeTealDb();
  const token = createOpaqueToken();
  const now = new Date();

  await db.collection("sessions").insertOne({
    tokenHash: hashSecret(token),
    discordId,
    platform,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  });

  return token;
}

function readBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token.length >= 32 && token.length <= 256 ? token : null;
}

export function readSessionToken(request: NextRequest): string | null {
  return readBearerToken(request) || request.cookies.get(SESSION_COOKIE)?.value || null;
}

export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<AnimeTealUser | null> {
  const token = readSessionToken(request);
  if (!token) return null;

  const db = await getAnimeTealDb();
  const now = new Date();
  const session = await db.collection("sessions").findOne({
    tokenHash: hashSecret(token),
    expiresAt: { $gt: now },
  });
  if (!session) return null;

  const user = await db.collection("users").findOne({ discordId: session.discordId });
  if (!user) return null;

  const staleBefore = new Date(now.getTime() - 2 * 60 * 1000);
  await db.collection("users").updateOne(
    {
      discordId: user.discordId,
      $or: [
        { lastSeenAt: { $lt: staleBefore } },
        { lastSeenAt: { $exists: false } },
      ],
    },
    {
      $set: {
        lastSeenAt: now,
        lastPlatform: session.platform as SessionPlatform,
      },
    },
  );

  return {
    discordId: user.discordId,
    username: user.username || "",
    displayName: user.displayName || user.username || "AnimeTeal user",
    avatarUrl: user.avatarUrl || "",
    createdAt: user.createdAt || now,
    lastLoginAt: user.lastLoginAt,
    lastSeenAt: user.lastSeenAt,
    lastPlatform: session.platform as SessionPlatform,
    isAdmin: isAdminDiscordId(user.discordId),
  };
}

export async function revokeRequestSession(request: NextRequest): Promise<void> {
  const token = readSessionToken(request);
  if (!token) return;
  const db = await getAnimeTealDb();
  await db.collection("sessions").deleteOne({ tokenHash: hashSecret(token) });
}

export function publicUser(user: AnimeTealUser) {
  return {
    discordId: user.discordId,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    isAdmin: user.isAdmin,
  };
}
