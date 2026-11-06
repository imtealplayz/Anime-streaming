<p align="center">
  <img src="public/animeteal-logo.svg" alt="AnimeTeal Logo" width="120" height="120" />
</p>

<h1 align="center">AnimeTeal</h1>

<p align="center">
  <strong>A personal anime discovery and streaming interface for web and Android.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

## Features

- Anime discovery, search, trending titles, details, relations, and release schedules through AniList GraphQL.
- Multi-provider video player with HLS playback, subtitle controls, intro/outro skipping, and fallback sources.
- No login, signup, Discord OAuth, or account requirement.
- Continue-watching history stored locally in the browser or Android WebView.
- Installable PWA for mobile and desktop, plus a lightweight Android WebView app.
- Optional read-only legacy community comments/profile data when a PocketBase endpoint is configured.

Streaming sources are provided by external services. Availability and playback quality can vary by title, provider, region, or time.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
git clone https://github.com/imtealplayz/Anime-streaming.git
cd Anime-streaming
npm install
npm run dev
```

Open http://localhost:3000.

Standalone mode uses AniList and the app's internal proxy routes. No login service or account database is required for the main browsing and playback experience.

## Android APK

An installable WebView APK can be built from the `android/` project. The GitHub Actions workflow builds a debug APK when Android app files change on `main`, or when manually dispatched.

1. Open the repository's **Actions** tab.
2. Run **Build AnimeTeal Android APK** (or wait for the workflow triggered by an Android source change).
3. Open the successful run and download the `animeteal-android-apk` artifact.
4. Extract `app-debug.apk` and install it on your Android device.

The APK opens the deployed AnimeTeal website and requires an internet connection for discovery and streaming.

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Optional external anime scraper API | Empty (uses AniList GraphQL) |
| `NEXT_PUBLIC_PROXY_URL` | HLS proxy endpoint | `/api/proxy` |
| `NEXT_PUBLIC_POCKETBASE_URL` | Optional read-only legacy community/profile data | Empty |
| `NEXT_PUBLIC_GA_ID` | Optional Google Analytics measurement ID | Empty |

## Credits and license

AnimeTeal is a personal fork and adaptation of [LuckDay21/miru-web](https://github.com/LuckDay21/miru-web). The original project is distributed under the MIT License; see [LICENSE](LICENSE) for the license text and attribution.
