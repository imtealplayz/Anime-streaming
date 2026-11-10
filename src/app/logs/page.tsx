import Link from "next/link";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity, LogIn, LogOut, MessageSquare, ShieldCheck } from "lucide-react";
import {
  SESSION_COOKIE,
  getAuthenticatedUser,
} from "@/lib/animeteal-auth";
import { getAnimeTealDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AuditLog = {
  _id: { toString(): string };
  eventType: "auth.login" | "auth.logout" | "comment.created" | string;
  discordId: string;
  username: string;
  displayName: string;
  platform?: "web" | "android" | null;
  location?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  };
  userAgent?: string;
  details?: {
    animeTitle?: string;
    animeId?: string;
    content?: string;
    spoiler?: boolean;
    commentId?: string;
  };
  createdAt: Date;
};

function eventLabel(eventType: string): string {
  if (eventType === "auth.login") return "Signed in";
  if (eventType === "auth.logout") return "Signed out";
  if (eventType === "comment.created") return "Posted a comment";
  return eventType;
}

function locationLabel(location?: AuditLog["location"]): string {
  if (!location) return "Location unavailable";
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Location unavailable";
}

export default async function SecurityLogsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/login");

  const sessionRequest = new NextRequest("https://animeteal.vercel.app/logs", {
    headers: { cookie: SESSION_COOKIE + "=" + token },
  });
  const user = await getAuthenticatedUser(sessionRequest);
  if (!user?.isAdmin) redirect("/");

  let events: AuditLog[] = [];
  let unavailable = false;

  try {
    const db = await getAnimeTealDb();
    events = await db
      .collection<AuditLog>("audit_logs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();
  } catch (error) {
    console.error("AnimeTeal audit log page failed:", error);
    unavailable = true;
  }

  return (
    <main className="min-h-screen bg-[#07090e] px-4 pb-20 pt-28 text-white sm:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin dashboard
        </Link>

        <header className="space-y-2">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
            <ShieldCheck className="h-4 w-4" /> Admin only
          </p>
          <h1 className="text-3xl font-black">Security activity</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
            The latest 30 account events, including successful logins, logouts, and submitted comments.
            IP-based login locations are approximate and can be affected by VPNs or network routing.
          </p>
        </header>

        {unavailable ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-5 text-sm text-rose-200">
            Security logs are temporarily unavailable. Try refreshing the page.
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d121d] p-8 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-3 font-semibold text-slate-200">No activity recorded yet</p>
            <p className="mt-1 text-xs text-slate-500">New successful logins, logouts, and comments will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const isComment = event.eventType === "comment.created";
              const isLogin = event.eventType === "auth.login";
              const Icon = isComment ? MessageSquare : isLogin ? LogIn : LogOut;
              const location = locationLabel(event.location);

              return (
                <article
                  key={event._id.toString()}
                  className="space-y-3 rounded-2xl border border-white/10 bg-[#0d121d] p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="rounded-xl border border-teal-300/15 bg-teal-300/[0.07] p-2 text-teal-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white">{event.displayName || event.username || "Unknown user"}</p>
                        <p className="mt-0.5 break-all text-xs text-slate-500">
                          @{event.username || "unknown"} · Discord ID: {event.discordId}
                        </p>
                        <p className="mt-2 text-sm text-slate-200">{eventLabel(event.eventType)}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-xs font-semibold text-slate-300">
                        {new Date(event.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">
                        {event.platform ? event.platform : "Unknown platform"}
                      </p>
                    </div>
                  </div>

                  {isLogin && (
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3 text-xs text-slate-300">
                      <p><span className="text-slate-500">Approx. location:</span> {location}</p>
                      {event.userAgent && (
                        <p className="mt-1 break-words text-slate-500">
                          <span className="text-slate-400">Browser/device:</span> {event.userAgent}
                        </p>
                      )}
                    </div>
                  )}

                  {isComment && (
                    <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <p className="text-xs font-semibold text-teal-200">
                        {event.details?.animeTitle || "Anime comment"}
                        {event.details?.spoiler ? " · Spoiler" : ""}
                      </p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
                        {event.details?.content || "(Comment text unavailable)"}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-slate-600">
          Logs are visible only to Discord IDs in ADMIN_DISCORD_IDS. Login location is inferred from the connection IP at city/region/country level; full IP addresses and precise coordinates are not stored. Events are retained for 90 days.
        </p>
      </div>
    </main>
  );
}
