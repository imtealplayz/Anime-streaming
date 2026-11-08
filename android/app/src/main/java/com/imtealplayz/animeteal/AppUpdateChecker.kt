package com.imtealplayz.animeteal

import android.content.Context
import android.net.Uri
import android.os.Build
import android.util.Base64
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.concurrent.TimeUnit

data class AppUpdateInfo(
    val versionCode: Long,
    val versionName: String,
    val minimumSupportedVersionCode: Long,
    val downloadUrl: String,
    val websiteUrl: String,
    val releaseNotes: String,
    val isRequired: Boolean,
)

/**
 * Fetches and verifies the AnimeTeal update manifest.
 *
 * The response keeps legacy top-level fields for version 5 clients. This
 * version verifies the RSA signature before trusting any update metadata,
 * then sends users to the official AnimeTeal download page. Android remains
 * responsible for verifying the APK's package-signing certificate.
 */
object AppUpdateChecker {
    private const val UPDATE_ENDPOINT =
        "https://animeteal.vercel.app/api/android/version"

    // X.509 SubjectPublicKeyInfo DER, Base64-encoded. The matching private key
    // is stored only as a sensitive Vercel Production environment variable.
    private const val UPDATE_PUBLIC_KEY =
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw4KNo/AS/TDpJkxA3bw+b81yVuAnQ3SjB3Ws7icozHTCoir0DhOCLjE7tGzq+Im37XAu1TqLWIrarQij6F8mIyZ4ZzKBgfdLyoSXOTqWs7Tnq0dRMoX3ot43npk7iLJXx7vFRDS11EADuBjCOmC/mEk8nYuDQ2IWTGtMSKp2feLY4yQ0p00nCD0Lh4J/MUpszzqa6voB855h/qjDtqoA9UwPWKGvJ4P61I9FXk0zSJsm8CJbBvRGEmWPgIttjI4PhetXA0xcNiErYiNTlATk+FRUSQkUtOcYKvvFC3Go6Z6QtaZXjFCvs1+j0jZTeNpi8dlCDaOsvHhaZJ8x9UYbewIDAQAB"

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

                val envelope = JSONObject(body)
                val signedPayload = envelope.optString("signedPayload").trim()
                val signatureValue = envelope.optString("signature").trim()
                if (signedPayload.isBlank() || signatureValue.isBlank()) {
                    return@withContext null
                }

                // Verify the exact signed payload string before decoding or
                // trusting the version, download destination, or release notes.
                val verifier = Signature.getInstance("SHA256withRSA")
                val publicKeyBytes = Base64.decode(UPDATE_PUBLIC_KEY, Base64.DEFAULT)
                val publicKey = KeyFactory.getInstance("RSA")
                    .generatePublic(X509EncodedKeySpec(publicKeyBytes))
                verifier.initVerify(publicKey)
                verifier.update(signedPayload.toByteArray(Charsets.UTF_8))
                if (!verifier.verify(Base64.decode(signatureValue, Base64.DEFAULT))) {
                    return@withContext null
                }

                val payloadBytes = Base64.decode(signedPayload, Base64.DEFAULT)
                val json = JSONObject(String(payloadBytes, Charsets.UTF_8))

                val latestCode = json.optLong("latestVersionCode", -1L)
                val latestName = json.optString("latestVersionName").trim()
                val minimumCode = json.optLong("minimumSupportedVersionCode", -1L)
                val downloadUrl = json.optString("downloadUrl").trim()
                val websiteUrl = json.optString("websiteUrl").trim()
                val notes = json.optString("releaseNotes").trim()

                val currentCode = installedVersionCode(context)
                val downloadUri = Uri.parse(downloadUrl)
                val websiteUri = Uri.parse(websiteUrl)

                // Validate both destinations. The GitHub link is retained for
                // version 5 compatibility; version 6+ opens the website URL.
                val validDownload =
                    downloadUri.scheme == "https" &&
                    downloadUri.host == "github.com" &&
                    downloadUri.path == "/imtealplayz/Anime-streaming/releases/download/android-latest/AnimeTeal.apk"

                val validWebsite =
                    websiteUri.scheme == "https" &&
                    websiteUri.host == "animeteal.vercel.app" &&
                    websiteUri.path == "/download"

                if (
                    latestCode <= currentCode ||
                    latestCode < 1L ||
                    latestName.isBlank() ||
                    minimumCode < 0L ||
                    minimumCode > latestCode ||
                    !validDownload ||
                    !validWebsite
                ) {
                    return@withContext null
                }

                AppUpdateInfo(
                    versionCode = latestCode,
                    versionName = latestName,
                    minimumSupportedVersionCode = minimumCode,
                    downloadUrl = downloadUrl,
                    websiteUrl = websiteUrl,
                    releaseNotes = notes,
                    isRequired = currentCode < minimumCode,
                )
            }
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (_: Exception) {
            // A failed or invalid update check must never block app startup.
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
