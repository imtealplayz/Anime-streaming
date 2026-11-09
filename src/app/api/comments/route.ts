import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/animeteal-auth";
import { getAnimeTealDb } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const animeId = (request.nextUrl.searchParams.get("animeId") || "").trim();
  if (!animeId || animeId.length > 160) {
    return NextResponse.json({ error: "A valid animeId is required." }, { status: 400 });
  }

  try {
    const page = Math.max(1, Math.min(10000, Number(request.nextUrl.searchParams.get("page")) || 1));
    const limit = Math.max(1, Math.min(30, Number(request.nextUrl.searchParams.get("limit")) || 20));
    const db = await getAnimeTealDb();
    const collection = db.collection("comments");
    const filter = { animeId };
    const [items, totalItems] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    return NextResponse.json(
      {
        items: items.map((item) => ({
          id: item._id.toString(),
          animeId: item.animeId,
          animeTitle: item.animeTitle,
          content: item.content,
          spoiler: Boolean(item.spoiler),
          displayName: item.displayName,
          avatarUrl: item.avatarUrl,
          createdAt: item.createdAt,
          isOwner: false,
        })),
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
        page,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("AnimeTeal comments read failed:", error);
    return NextResponse.json(
      { error: "Comments are temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Sign in with Discord to comment." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const animeId = typeof body.animeId === "string" ? body.animeId.trim() : "";
    const animeTitle = typeof body.animeTitle === "string" ? body.animeTitle.trim().slice(0, 200) : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const spoiler = body.spoiler === true;

    if (!animeId || animeId.length > 160 || !content || content.length > 1000) {
      return NextResponse.json(
        { error: "Comments must be between 1 and 1,000 characters." },
        { status: 400 },
      );
    }

    const db = await getAnimeTealDb();
    const now = new Date();
    const recent = await db.collection("comments").findOne({
      userDiscordId: user.discordId,
      createdAt: { $gte: new Date(now.getTime() - 20 * 1000) },
    });
    if (recent) {
      return NextResponse.json(
        { error: "Please wait a few seconds before posting another comment." },
        { status: 429 },
      );
    }

    const result = await db.collection("comments").insertOne({
      animeId,
      animeTitle,
      content,
      spoiler,
      userDiscordId: user.discordId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        item: {
          id: result.insertedId.toString(),
          animeId,
          animeTitle,
          content,
          spoiler,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: now,
          isOwner: true,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("AnimeTeal comment create failed:", error);
    return NextResponse.json(
      { error: "Comments are temporarily unavailable." },
      { status: 503 },
    );
  }
}
