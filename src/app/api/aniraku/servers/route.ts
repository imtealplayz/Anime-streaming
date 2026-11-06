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
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Origin: "https://aniraku.tech",
        Referer: "https://aniraku.tech/",
        // Cloudflare-protected Aniraku/provider routes reject custom non-browser UAs.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(22000),
    });

    const body = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "";

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Aniraku returned HTTP ${upstream.status}.` },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        {
          error: "Aniraku returned an HTML/non-JSON response instead of its server list. The upstream may be showing an anti-bot challenge.",
          upstreamContentType: contentType || "unknown",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    try {
      const payload = JSON.parse(body);
      if (!Array.isArray(payload)) {
        throw new Error("Expected the Aniraku server list to be an array.");
      }
    } catch {
      return NextResponse.json(
        { error: "Aniraku returned malformed server-list JSON." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
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
