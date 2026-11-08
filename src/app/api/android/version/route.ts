import { createPrivateKey, sign } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Keep these legacy top-level fields so version 5 of the app can still
// discover the upgrade and download it from the existing GitHub release URL.
// Version 6+ verifies signedPayload and opens websiteUrl instead.
const update = {
  protocolVersion: 1,
  latestVersionCode: 5,
  latestVersionName: "2.2.1",
  minimumSupportedVersionCode: 5,
  downloadUrl:
    "https://github.com/imtealplayz/Anime-streaming/releases/download/android-latest/AnimeTeal.apk",
  websiteUrl: "https://animeteal.vercel.app/download",
  releaseNotes:
    "AnimeTeal's signed update service is ready. Future releases will open the official AnimeTeal download page.",
};

export async function GET() {
  const encodedPrivateKey = process.env.ANDROID_UPDATE_SIGNING_PRIVATE_KEY_B64;
  if (!encodedPrivateKey) {
    return Response.json(
      { error: "Android update signing is not configured." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }

  try {
    const privateKey = createPrivateKey({
      key: Buffer.from(encodedPrivateKey, "base64"),
      format: "der",
      type: "pkcs1",
    });
    const signedPayload = Buffer.from(JSON.stringify(update), "utf8").toString("base64");
    const signature = sign(
      "RSA-SHA256",
      Buffer.from(signedPayload, "utf8"),
      privateKey,
    ).toString("base64");

    return Response.json(
      { ...update, signedPayload, signature },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Could not sign the Android update manifest." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
