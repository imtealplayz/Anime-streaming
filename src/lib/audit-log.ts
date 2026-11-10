import "server-only";
import type { Db } from "mongodb";
import type { NextRequest } from "next/server";
import type { AnimeTealUser, SessionPlatform } from "@/lib/animeteal-auth";

type AuditEventType = "auth.login" | "auth.logout" | "comment.created";

type AuditActor = Pick<
  AnimeTealUser,
  "discordId" | "username" | "displayName"
>;

function readGeoHeader(request: NextRequest, name: string): string | null {
  const value = request.headers.get(name);
  if (!value) return null;

  try {
    return decodeURIComponent(value).slice(0, 100);
  } catch {
    return value.slice(0, 100);
  }
}

/**
 * Append a moderation/security event. Only coarse IP-derived city/region/country
 * and a shortened user-agent are recorded for successful logins; raw IPs and
 * precise coordinates are intentionally not stored.
 */
export async function recordAuditEvent(
  db: Db,
  request: NextRequest,
  event: {
    eventType: AuditEventType;
    actor: AuditActor;
    platform?: SessionPlatform;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const entry = {
    eventType: event.eventType,
    discordId: event.actor.discordId,
    username: event.actor.username,
    displayName: event.actor.displayName,
    platform: event.platform ?? null,
    details: event.details ?? {},
    ...(event.eventType === "auth.login"
      ? {
          location: {
            city: readGeoHeader(request, "x-vercel-ip-city"),
            region: request.headers.get("x-vercel-ip-country-region"),
            country: request.headers.get("x-vercel-ip-country"),
          },
          userAgent: (request.headers.get("user-agent") || "").slice(0, 320),
        }
      : {}),
    createdAt: new Date(),
  };

  try {
    await db.collection("audit_logs").insertOne(entry);
  } catch (error) {
    // A logging outage must not turn an otherwise successful login or comment
    // into a failed user action. The failure remains visible in server logs.
    console.error("AnimeTeal audit event could not be recorded:", error);
  }
}
