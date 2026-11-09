import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, publicUser } from "@/lib/animeteal-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(
      { user: publicUser(user) },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("AnimeTeal session lookup failed:", error);
    return NextResponse.json(
      { error: "AnimeTeal account storage is not connected." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
