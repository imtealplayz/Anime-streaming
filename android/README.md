# AnimeTeal for Android

This is a lightweight Android WebView app for the AnimeTeal website. The website remains the source of truth; the APK loads the deployed site and keeps its own local WebView storage for preferences and watch history.

## Build

The GitHub Actions workflow builds an installable debug APK automatically when Android files change on main, or when the workflow is started manually.

1. Open the repository's Actions tab.
2. Select Build AnimeTeal Android APK.
3. Open the latest successful workflow run.
4. Download the animeteal-android-apk artifact and extract app-debug.apk.
5. Transfer it to the Android device and install it.

A debug APK is suitable for personal sideloading. It is not a Play Store release. Debug signing can differ between CI runs, so an updated debug APK may require uninstalling the previous build first.

## Website URL

The app currently loads:

https://animeteal.vercel.app

Change SITE_URL in app/src/main/java/com/imtealplayz/animeteal/MainActivity.kt if the Vercel production domain changes.

## Notes

- Internet access is required for the site, metadata, and streams.
- Playback is provided by external video providers and may vary by title or provider availability.
- Browsing data and continue-watching history in the APK are stored separately from Chrome or the website in another browser.
