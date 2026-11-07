package com.imtealplayz.animeteal

import android.content.Context
import android.net.Uri
import android.os.Build
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class AppUpdateInfo(
    val versionCode: Long,
    val versionName: String,
    val minimumSupportedVersionCode: Long,
    val downloadUrl: String,
    val releaseNotes: String,
    val isRequired: Boolean,
)

/**
 * Checks the AnimeTeal Vercel endpoint for a newer Android APK.
 *
 * The endpoint only advertises releases that have already been published.
 * Downloads are handed to the Android browser/package installer; the app
 * never silently installs an APK.
 */
object AppUpdateChecker {
    private const val UPDATE_ENDPOINT =
        "https://animeteal.vercel.app/api/android/version"

    private val client = OkHttpClient.Builder()
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(4, TimeUnit.SECONDS)
        .callTimeout(6, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    suspend fun check(context: Context): AppUpdateInfo? = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(UPDATE_ENDPOINT)
                .header("Accept", "application/json")
                .header("Cache-Control", "no-cache")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return@withContext null
                val body = response.body?.string().orEmpty()
                if (body.isBlank()) return@withContext null

                val json = JSONObject(body)
                val latestCode = json.optLong("latestVersionCode", -1L)
                val latestName = json.optString("latestVersionName").trim()
                val minimumCode = json.optLong("minimumSupportedVersionCode", 0L)
                val downloadUrl = json.optString("downloadUrl").trim()
                val notes = json.optString("releaseNotes").trim()

                val currentCode = installedVersionCode(context)
                val uri = Uri.parse(downloadUrl)

                // Only accept the official HTTPS GitHub release asset.
                val validDownload =
                    uri.scheme == "https" &&
                    uri.host == "github.com" &&
                    uri.path == "/imtealplayz/Anime-streaming/releases/download/android-latest/AnimeTeal.apk"

                if (
                    latestCode <= currentCode ||
                    latestCode < 1L ||
                    latestName.isBlank() ||
                    minimumCode < 0L ||
                    minimumCode > latestCode ||
                    !validDownload
                ) {
                    return@withContext null
                }

                AppUpdateInfo(
                    versionCode = latestCode,
                    versionName = latestName,
                    minimumSupportedVersionCode = minimumCode,
                    downloadUrl = downloadUrl,
                    releaseNotes = notes,
                    isRequired = currentCode < minimumCode,
                )
            }
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (_: Exception) {
            // Update checks are best-effort and must never block app startup.
            null
        }
    }

    @Suppress("DEPRECATION")
    private fun installedVersionCode(context: Context): Long {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.longVersionCode
        } else {
            info.versionCode.toLong()
        }
    }
}
