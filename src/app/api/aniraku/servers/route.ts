import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const animeId = request.nextUrl.searchParams.get("animeId") || "";
  const episode = request.nextUrl.searchParams.get("episode") || "";
  const lang = request.nextUrl.searchParams.get("lang") === "dub" ? "dub" : "sub";

  if (!/^\d+$/.test(animeId) || Number(animeId) <= 0 ||
      !/^\d+$/.test(episode) || Number(episode) <= 0) {
    return NextResponse.json({ error: "Valid animeId and episode are required." }, { status: 400 });
  }

  const upstreamUrl = new URL("https://api.aniraku.tech/api/v1/servers");
  upstreamUrl.searchParams.set("animeId", animeId);
  upstreamUrl.searchParams.set("episode", episode);
  upstreamUrl.searchParams.set("lang", lang);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Referer: "https://aniraku.tech/",
        "User-Agent": "AnimeTeal/1.0 (web player)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(22000),
    });

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream stream discovery failed.";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
