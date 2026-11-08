# AnimeTeal Android — Native App

AnimeTeal is a standalone Kotlin + Jetpack Compose application. It does not open the AnimeTeal website or use a WebView for its main interface.

## Native features

- Home feed with trending, recently updated and popular anime.
- Search backed by the AniList catalogue through the managed backend.
- Native anime details and episode lists.
- Multi-provider sub/dub source discovery with server-side verification and fallback.
- Native HLS/MP4 playback through Android Media3 and the backend media proxy.
- Local favorites and continue-watching progress.
- No user-editable API settings; the service is configured by the app.

## API service

The app uses the Aniraku backend at `https://api.aniraku.tech` for episode metadata, provider discovery, source resolution and media proxying. The backend is an actively maintained open-source Go service with multiple streaming providers, source verification, automatic fallback, request rate limiting, and an HLS-aware proxy.

Repository: https://github.com/Aniraku/Aniraku-Backend

Catalogue queries go through the backend's paced AniList proxy. Provider uptime and stream availability still depend on upstream hosts and can vary by title or region; this is not a guarantee that every anime or provider will always be available.

## Build

The GitHub Actions workflow builds a debug APK automatically when `android/**` changes on `main`, or when manually dispatched.

1. Open the repository's Actions tab.
2. Select **Build AnimeTeal Android APK**.
3. Download the `animeteal-android-apk` artifact.
4. Extract `app-debug.apk` and install it on an Android device.

This is a personal debug APK, not a Play Store release.


## Signed app updates

The app checks `https://animeteal.vercel.app/api/android/version` on startup. Version 6 and later verify the update manifest with an embedded RSA public key before trusting its version, release notes, or website destination.

- The matching private key is stored only in Vercel as the sensitive Production variable `ANDROID_UPDATE_SIGNING_PRIVATE_KEY_B64`.
- Keep the existing key permanently. Do not rotate it unless a new app build is prepared with the replacement public key.
- To publish an update, increment `versionCode` and `versionName` in `android/app/build.gradle.kts`, build and test the APK, publish the GitHub release asset at the existing `android-latest/AnimeTeal.apk` URL, then update the signed manifest values in `src/app/api/android/version/route.ts` and deploy the website.
- The manifest keeps the GitHub APK URL as a legacy field so version 5 can install version 6. Version 6 and later open `https://animeteal.vercel.app/download` instead.
- Android's package installer still enforces the APK's signing-certificate continuity. The RSA manifest signature authenticates update metadata; it does not replace APK signing.

Never commit or share the private signing key.
