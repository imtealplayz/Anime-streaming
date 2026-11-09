package com.imtealplayz.animeteal

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.concurrent.TimeUnit

data class DiscordAccount(
    val discordId: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String,
    val accessToken: String,
    val isAdmin: Boolean,
)

class DiscordAuthManager(context: Context) {
    private val appContext = context.applicationContext
    private val masterKey = MasterKey.Builder(appContext)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    private val preferences = EncryptedSharedPreferences.create(
        appContext,
        "animeteal_account_secure",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(25, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val apiBase = "https://animeteal.vercel.app"

    fun current(): DiscordAccount? {
        val token = preferences.getString("access_token", null) ?: return null
        val id = preferences.getString("discord_id", null) ?: return null
        return DiscordAccount(
            discordId = id,
            username = preferences.getString("username", "").orEmpty(),
            displayName = preferences.getString("display_name", "AnimeTeal user").orEmpty(),
            avatarUrl = preferences.getString("avatar_url", "").orEmpty(),
            accessToken = token,
            isAdmin = preferences.getBoolean("is_admin", false),
        )
    }

    fun beginLogin(context: Context) {
        val random = ByteArray(32)
        SecureRandom().nextBytes(random)
        val verifier = Base64.encodeToString(
            random,
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
        )
        val challenge = Base64.encodeToString(
            MessageDigest.getInstance("SHA-256").digest(verifier.toByteArray(Charsets.US_ASCII)),
            Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING,
        )
        preferences.edit().putString("pkce_verifier", verifier).apply()

        val loginUrl = Uri.parse("$apiBase/api/auth/discord/start")
            .buildUpon()
            .appendQueryParameter("client", "android")
            .appendQueryParameter("code_challenge", challenge)
            .build()

        context.startActivity(
            Intent(Intent.ACTION_VIEW, loginUrl).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
    }

    suspend fun exchangeTicket(ticket: String): DiscordAccount = withContext(Dispatchers.IO) {
        val verifier = preferences.getString("pkce_verifier", null)
            ?: throw IOException("The sign-in attempt expired. Please try again.")

        val payload = JSONObject()
            .put("ticket", ticket)
            .put("codeVerifier", verifier)
        val request = Request.Builder()
            .url("$apiBase/api/auth/mobile/exchange")
            .post(payload.toString().toRequestBody(jsonType))
            .header("Accept", "application/json")
            .build()

        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            val result = try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
            if (!response.isSuccessful) {
                throw IOException(result.optString("error").ifBlank { "Discord sign-in could not be completed." })
            }

            val token = result.optString("accessToken")
            val user = result.optJSONObject("user") ?: throw IOException("AnimeTeal returned an invalid account.")
            val account = DiscordAccount(
                discordId = user.optString("discordId"),
                username = user.optString("username"),
                displayName = user.optString("displayName", user.optString("username")),
                avatarUrl = user.optString("avatarUrl"),
                accessToken = token,
                isAdmin = user.optBoolean("isAdmin", false),
            )
            if (token.isBlank() || account.discordId.isBlank()) {
                throw IOException("AnimeTeal returned an incomplete account.")
            }
            save(account)
            preferences.edit().remove("pkce_verifier").apply()
            account
        }
    }

    suspend fun refresh(): DiscordAccount? = withContext(Dispatchers.IO) {
        val current = current() ?: return@withContext null
        val request = Request.Builder()
            .url("$apiBase/api/auth/me")
            .get()
            .header("Authorization", "Bearer ${current.accessToken}")
            .header("Accept", "application/json")
            .build()

        try {
            client.newCall(request).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    if (response.code == 401 || response.code == 403) {
                        clear()
                        return@withContext null
                    }
                    return@withContext current
                }
                val user = JSONObject(raw).optJSONObject("user")
                    ?: throw IOException("AnimeTeal returned an invalid session.")
                val refreshed = current.copy(
                    username = user.optString("username", current.username),
                    displayName = user.optString("displayName", current.displayName),
                    avatarUrl = user.optString("avatarUrl", current.avatarUrl),
                    isAdmin = user.optBoolean("isAdmin", current.isAdmin),
                )
                save(refreshed)
                refreshed
            }
        } catch (error: Exception) {
            // Keep the encrypted local session during a temporary network outage.
            current
        }
    }

    suspend fun logout() = withContext(Dispatchers.IO) {
        val current = current()
        if (current != null) {
            val request = Request.Builder()
                .url("$apiBase/api/auth/logout")
                .post(ByteArray(0).toRequestBody(null))
                .header("Authorization", "Bearer ${current.accessToken}")
                .build()
            try {
                client.newCall(request).execute().close()
            } catch (_: Exception) {
                // The server-side session expires automatically even if offline.
            }
        }
        clear()
    }

    private fun save(account: DiscordAccount) {
        preferences.edit()
            .putString("access_token", account.accessToken)
            .putString("discord_id", account.discordId)
            .putString("username", account.username)
            .putString("display_name", account.displayName)
            .putString("avatar_url", account.avatarUrl)
            .putBoolean("is_admin", account.isAdmin)
            .apply()
    }

    private fun clear() {
        preferences.edit()
            .remove("access_token")
            .remove("discord_id")
            .remove("username")
            .remove("display_name")
            .remove("avatar_url")
            .remove("is_admin")
            .remove("pkce_verifier")
            .apply()
    }
}
