import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const ANIRAKU_API_BASE_URL = "https://api.aniraku.tech";

function absoluteAnirakuMediaUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  // The backend now returns opaque media links as relative /api/v1/proxy?k=…
  // URLs. Root them at the backend host before returning them to the player.
  return value.startsWith("/api/v1/")
    ? `${ANIRAKU_API_BASE_URL}${value}`
    : value;
}

function normalizeAnirakuServers(payload: unknown[]) {
  return payload.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const server = entry as Record<string, unknown>;
    if (!Array.isArray(server.sources)) return server;

    const sources = server.sources.map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const source = entry as Record<string, unknown>;
      const subtitles = Array.isArray(source.subtitles)
        ? source.subtitles.map((entry) => {
            if (!entry || typeof entry !== "object") return entry;
            const track = entry as Record<string, unknown>;
            return { ...track, url: absoluteAnirakuMediaUrl(track.url) };
          })
        : source.subtitles;

      return {
        ...source,
        url: absoluteAnirakuMediaUrl(source.url),
        ...(Array.isArray(source.subtitles) ? { subtitles } : {}),
      };
    });

    return { ...server, sources };
  });
}

export async function GET(request: NextRequest) {
  const animeId = request.nextUrl.searchParams.get("animeId") || "";
  const episode = request.nextUrl.searchParams.get("episode") || "";
  const lang = request.nextUrl.searchParams.get("lang") === "dub" ? "dub" : "sub";
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";

  if (!/^\d+$/.test(animeId) || Number(animeId) <= 0 ||
      !/^\d+$/.test(episode) || Number(episode) <= 0) {
    return NextResponse.json({ error: "Valid animeId and episode are required." }, { status: 400 });
  }

  const upstreamUrl = new URL("https://api.aniraku.tech/api/v1/servers");
  upstreamUrl.searchParams.set("animeId", animeId);
  upstreamUrl.searchParams.set("episode", episode);
  upstreamUrl.searchParams.set("lang", lang);
  if (refresh) upstreamUrl.searchParams.set("refresh", "1");

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
      const normalizedPayload = normalizeAnirakuServers(payload);
      return NextResponse.json(normalizedPayload, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    } catch {
      return NextResponse.json(
        { error: "Aniraku returned malformed server-list JSON." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream stream discovery failed.";
    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
