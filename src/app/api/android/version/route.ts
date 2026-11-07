export const dynamic = "force-dynamic";
export const revalidate = 0;

const update = {
  latestVersionCode: 5,
  latestVersionName: "2.2.1",
  minimumSupportedVersionCode: 5,
  downloadUrl:
    "https://github.com/imtealplayz/Anime-streaming/releases/download/android-latest/AnimeTeal.apk",
  releaseNotes:
    "AnimeTeal now checks for app updates automatically. This is the first release using the permanent signing key.",
};

export async function GET() {
  return Response.json(update, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
