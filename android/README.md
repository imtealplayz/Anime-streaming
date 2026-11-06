# AnimeTeal Android — Native App

The Android app is a standalone Kotlin + Jetpack Compose application. It does not open the AnimeTeal website or use a WebView.

## Native features

- Home feed with spotlight, trending, recently updated and popular anime.
- Search backed by a HiAnime-compatible REST API.
- Native anime details and episode lists.
- Sub/dub server resolution and direct HLS playback through Android Media3.
- Local favorites and continue-watching progress.
- API endpoint can be changed in **Settings**.

## API

The default API base is:

`https://api-aniwatch.onrender.com/api/v2/hianime`

This is a community demo API, not operated by AnimeTeal or HiAnime. Its upstream repository warns that the demo host is rate-limited and recommends deploying a personal instance for reliable use. The app lets you change the API base URL in Settings.

For a personal deployment, use the documented HiAnime-compatible API project:
https://github.com/DeepakWorld/hianimeapi

The API provides home, search, anime info, episode list, episode server and episode-source endpoints. Actual source availability depends on the upstream provider and region.

## Build

The GitHub Actions workflow builds a debug APK automatically when `android/**` changes on `main`, or when manually dispatched.

1. Open the repository's Actions tab.
2. Select **Build AnimeTeal Android APK**.
3. Download the `animeteal-android-apk` artifact.
4. Extract `app-debug.apk` and install it on an Android device.

This is a personal debug APK, not a Play Store release.
