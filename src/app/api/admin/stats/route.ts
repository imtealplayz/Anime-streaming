import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/animeteal-auth";
import { getAnimeTealDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const db = await getAnimeTealDb();
    const now = new Date();
    const today = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const users = db.collection("users");
    const comments = db.collection("comments");
    const [
      registeredUsers,
      activeToday,
      active30Days,
      active7Days,
      androidActiveToday,
      websiteActiveToday,
      newUsers7Days,
      totalComments,
    ] = await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ lastSeenAt: { $gte: today } }),
      users.countDocuments({ lastSeenAt: { $gte: month } }),
      users.countDocuments({ lastSeenAt: { $gte: week } }),
      users.countDocuments({ lastPlatform: "android", lastSeenAt: { $gte: today } }),
      users.countDocuments({ lastPlatform: "web", lastSeenAt: { $gte: today } }),
      users.countDocuments({ createdAt: { $gte: week } }),
      comments.countDocuments({}),
    ]);

    return NextResponse.json(
      {
        registeredUsers,
        activeToday,
        active7Days,
        active30Days,
        androidActiveToday,
        websiteActiveToday,
        newUsers7Days,
        totalComments,
        generatedAt: now.toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("AnimeTeal admin stats failed:", error);
    return NextResponse.json(
      { error: "AnimeTeal account storage is not connected." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
