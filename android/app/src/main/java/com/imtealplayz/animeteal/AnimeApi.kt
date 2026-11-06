package com.imtealplayz.animeteal

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class AnimeItem(
    val id: String, val name: String, val poster: String, val type: String = "Anime",
    val episodes: Int = 0, val description: String = "", val rating: String = "",
)
data class AnimeDetail(
    val item: AnimeItem, val banner: String = "", val description: String = "",
    val status: String = "", val genres: List<String> = emptyList(),
    val studio: String = "", val aired: String = "", val duration: String = "",
)
data class EpisodeItem(val id: String, val number: Int, val title: String, val isFiller: Boolean = false)
data class EpisodeServer(val name: String, val category: String, val provider: String = name)
data class StreamSubtitle(val language: String, val url: String)
data class StreamSource(
    val url: String, val quality: String, val headers: Map<String, String>,
    val subtitles: List<StreamSubtitle>, val type: String = "hls",
)
data class HomeFeed(
    val spotlight: List<AnimeItem>, val trending: List<AnimeItem>,
    val latest: List<AnimeItem>, val popular: List<AnimeItem>,
)

/** Fixed AnimeTeal service client; endpoint is app-owned, not user-editable. */
class AnimeApi {
    private val base = "https://api.aniraku.tech"
    private val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    private val referer = "https://aniraku.tech/"
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(25, TimeUnit.SECONDS).readTimeout(55, TimeUnit.SECONDS)
        .callTimeout(70, TimeUnit.SECONDS).build()

    private fun url(path: String, query: Map<String, String> = emptyMap()): String {
        val builder = (base + "/" + path.trimStart('/')).toHttpUrl().newBuilder()
        query.forEach { (key, value) -> builder.addQueryParameter(key, value) }
        return builder.build().toString()
    }

    private suspend fun raw(path: String, query: Map<String, String> = emptyMap(), body: JSONObject? = null): String =
        withContext(Dispatchers.IO) {
            val builder = Request.Builder().url(url(path, query))
                .header("Accept", "application/json").header("User-Agent", userAgent)
                .header("Referer", referer)
            if (body == null) builder.get() else builder.post(body.toString().toRequestBody(jsonType))
                .header("Content-Type", "application/json")
            client.newCall(builder.build()).execute().use { response ->
                val text = response.body?.string().orEmpty()
                val ct = response.header("Content-Type").orEmpty()
                val trimmed = text.trimStart()
                val html = ct.contains("text/html", true) || trimmed.startsWith("<!doctype html", true) || trimmed.startsWith("<html", true)
                if (!response.isSuccessful) {
                    val detail = try {
                        val obj = JSONObject(text)
                        obj.optString("error").ifBlank { obj.optString("message") }
                    } catch (_: Exception) { "" }
                    val message = when {
                        response.code == 429 -> {
                            val wait = response.header("Retry-After")?.toIntOrNull()
                            "Anime service is busy (HTTP 429)." + (wait?.takeIf { it > 0 }?.let { " Try again in $it seconds." } ?: " Please wait a little and retry.")
                        }
                        html -> "The anime service returned a security challenge instead of data (HTTP ${response.code}). Please retry later."
                        detail.isNotBlank() -> detail
                        else -> "Anime service returned HTTP ${response.code}."
                    }
                    throw IOException(message)
                }
                if (html) throw IOException("The anime service returned a web security challenge instead of anime data. Please retry later.")
                if (text.isBlank()) throw IOException("The anime service returned an empty response.")
                text
            }
        }

    private suspend fun obj(path: String, query: Map<String, String> = emptyMap(), body: JSONObject? = null): JSONObject {
        val text = raw(path, query, body)
        return try { JSONObject(text) } catch (e: Exception) { throw IOException("The anime service returned invalid JSON.", e) }
    }
    private suspend fun array(path: String, query: Map<String, String> = emptyMap()): JSONArray {
        val text = raw(path, query)
        return try { JSONArray(text) } catch (_: Exception) {
            val wrapper = try { JSONObject(text) } catch (_: Exception) { null }
            wrapper?.optJSONArray("servers") ?: wrapper?.optJSONArray("data")
            ?: throw IOException("The anime service returned an invalid server list.")
        }
    }
    private fun graphData(root: JSONObject): JSONObject {
        val errors = root.optJSONArray("errors")
        if (errors != null && errors.length() > 0) throw IOException(
            errors.optJSONObject(0)?.optString("message")?.takeIf { it.isNotBlank() } ?: "AniList catalogue request failed."
        )
        return root.optJSONObject("data") ?: root
    }
    private suspend fun anilist(query: String, variables: JSONObject = JSONObject()) =
        graphData(obj("/api/v1/anilist", body = JSONObject().put("query", query).put("variables", variables)))

    private fun text(obj: JSONObject?, vararg keys: String): String {
        if (obj == null) return ""
        for (key in keys) {
            val v = obj.opt(key)
            if (v != null && v != JSONObject.NULL) v.toString().trim().takeIf { it.isNotEmpty() && it != "null" }?.let { return it }
        }
        return ""
    }
    private fun clean(value: String) = value
        .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), "\n")
        .replace(Regex("</p\\s*>", RegexOption.IGNORE_CASE), "\n\n")
        .replace(Regex("<[^>]*>"), "").replace("&amp;", "&")
        .replace("&quot;", "\"").replace("&#039;", "'")
        .replace("&lt;", "<").replace("&gt;", ">").trim()

    private fun card(o: JSONObject): AnimeItem {
        val cover = o.optJSONObject("coverImage")
        val title = o.optJSONObject("title")
        val score = o.optInt("averageScore", 0)
        return AnimeItem(
            id = text(o, "id"),
            name = text(title, "english", "romaji", "native").ifBlank { "Untitled anime" },
            poster = text(cover, "extraLarge", "large"),
            type = text(o, "format", "type").ifBlank { "Anime" },
            episodes = o.optInt("episodes", 0),
            description = clean(text(o, "description")),
            rating = if (score > 0) String.format("%.1f", score / 10.0) else "",
        )
    }
    private fun cards(a: JSONArray?): List<AnimeItem> {
        if (a == null) return emptyList()
        return buildList {
            for (i in 0 until a.length()) {
                val item = a.optJSONObject(i) ?: continue
                val parsed = card(item)
                if (parsed.id.isNotBlank()) add(parsed)
            }
        }
    }

    suspend fun home(): HomeFeed {
        val query = """
            query {
              trending: Page(page: 1, perPage: 18) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
                id title { romaji english native } coverImage { extraLarge large } format episodes description averageScore
              } }
              latest: Page(page: 1, perPage: 18) { media(type: ANIME, sort: UPDATED_AT_DESC, isAdult: false) {
                id title { romaji english native } coverImage { extraLarge large } format episodes description averageScore
              } }
              popular: Page(page: 1, perPage: 18) { media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
                id title { romaji english native } coverImage { extraLarge large } format episodes description averageScore
              } }
            }
        """.trimIndent()
        val data = anilist(query)
        val trending = cards(data.optJSONObject("trending")?.optJSONArray("media"))
        return HomeFeed(trending.take(5), trending,
            cards(data.optJSONObject("latest")?.optJSONArray("media")),
            cards(data.optJSONObject("popular")?.optJSONArray("media")))
    }

    suspend fun search(query: String, page: Int = 1): List<AnimeItem> {
        val gql = buildString {
            append("query (")
            append('$')
            append("search: String!, ")
            append('$')
            append("page: Int!) { Page(page: ")
            append('$')
            append("page, perPage: 24) { media(search: ")
            append('$')
            append("search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) { ")
            append("id title { romaji english native } coverImage { extraLarge large } format episodes description averageScore")
            append(" } } }")
        }
        val data = anilist(gql, JSONObject().put("search", query).put("page", page))
        return cards(data.optJSONObject("Page")?.optJSONArray("media"))
    }

    suspend fun detail(animeId: String): AnimeDetail {
        val id = animeId.toLongOrNull() ?: throw IOException("This anime has an invalid catalogue ID.")
        val media = obj("/api/v1/anime/$id").let { it.optJSONObject("data") ?: it.optJSONObject("anime") ?: it }
        val cover = media.optJSONObject("coverImage")
        val genresArray = media.optJSONArray("genres")
        val genres = if (genresArray == null) emptyList() else buildList {
            for (i in 0 until genresArray.length()) genresArray.optString(i).takeIf { it.isNotBlank() }?.let(::add)
        }
        val studios = media.optJSONObject("studios")?.optJSONArray("nodes")
        val year = media.optJSONObject("startDate")?.optInt("year", 0) ?: 0
        val duration = media.optInt("duration", 0)
        return AnimeDetail(
            item = card(media),
            banner = text(media, "bannerImage").ifBlank { text(cover, "extraLarge", "large") },
            description = clean(text(media, "description")),
            status = text(media, "status").lowercase().replace('_', ' ').replaceFirstChar { it.uppercase() },
            genres = genres,
            studio = studios?.optJSONObject(0)?.optString("name").orEmpty(),
            aired = year.takeIf { it > 0 }?.toString().orEmpty(),
            duration = duration.takeIf { it > 0 }?.let { "$it min/ep" }.orEmpty(),
        )
    }

    suspend fun episodes(animeId: String): List<EpisodeItem> {
        val id = animeId.toLongOrNull() ?: throw IOException("This anime has an invalid catalogue ID.")
        val data = obj("/api/v1/anime/$id/episodes").let { it.optJSONObject("data") ?: it }
        val a = data.optJSONArray("episodes") ?: JSONArray()
        return buildList {
            for (i in 0 until a.length()) {
                val item = a.optJSONObject(i) ?: continue
                val n = item.optInt("number", i + 1)
                if (n > 0) add(EpisodeItem("$id:$n", n, text(item, "title").ifBlank { "Episode $n" },
                    item.optBoolean("isFiller", item.optBoolean("filler", false))))
            }
        }.sortedBy { it.number }
    }

    private fun episodeKey(key: String): Pair<Long, Int> {
        val parts = key.split(":", limit = 2)
        val id = parts.getOrNull(0)?.toLongOrNull()
        val ep = parts.getOrNull(1)?.toIntOrNull()
        if (id == null || ep == null || id <= 0 || ep <= 0)
            throw IOException("This saved episode uses an older source ID. Open the anime and select the episode again.")
        return id to ep
    }

    suspend fun servers(episodeId: String, category: String): List<EpisodeServer> {
        val (id, ep) = episodeKey(episodeId)
        val a = array("/api/v1/servers", mapOf("animeId" to id.toString(), "episode" to ep.toString(), "lang" to category))
        return buildList {
            for (i in 0 until a.length()) {
                val item = a.optJSONObject(i) ?: continue
                val provider = text(item, "provider")
                val name = text(item, "name", "provider")
                if (provider.isNotBlank() && name.isNotBlank()) add(EpisodeServer(name, category, provider))
            }
        }.distinctBy { it.provider }
    }

    suspend fun source(episodeId: String, provider: String, category: String): StreamSource {
        val (id, ep) = episodeKey(episodeId)
        val request = JSONObject().put("animeId", id).put("episode", ep)
            .put("provider", provider).put("lang", category).put("quality", "auto")
        val data = obj("/api/v1/stream", body = request).let { it.optJSONObject("data") ?: it }
        val sources = data.optJSONArray("sources") ?: JSONArray()
        val chosen = (0 until sources.length()).mapNotNull { sources.optJSONObject(it) }.firstOrNull { item ->
            val u = text(item, "url")
            val t = text(item, "type", "mime").lowercase()
            val verdict = text(item, "verification", "Verification").lowercase()
            u.isNotBlank() && verdict != "dead" &&
                (t.contains("hls") || t.contains("mpegurl") || t.contains("mp4") ||
                    u.contains(".m3u8", true) || u.contains(".mp4", true))
        } ?: throw IOException("The selected provider did not return a native HLS or MP4 stream.")

        val headers = linkedMapOf("User-Agent" to userAgent, "Referer" to referer)
        data.optJSONObject("headers")?.let { h ->
            h.keys().forEach { key -> h.optString(key).takeIf { it.isNotBlank() }?.let { headers[key] = it } }
        }
        val subArray = chosen.optJSONArray("subtitles") ?: data.optJSONArray("subtitles") ?: JSONArray()
        val subtitles = buildList {
            for (i in 0 until subArray.length()) {
                val s = subArray.optJSONObject(i) ?: continue
                val u = text(s, "url", "file")
                if (u.isNotBlank()) add(StreamSubtitle(text(s, "lang", "label").ifBlank { "Subtitle" }, u))
            }
        }
        val streamUrl = text(chosen, "url")
        return StreamSource(streamUrl, text(chosen, "quality").ifBlank { "Auto" }, headers, subtitles,
            text(chosen, "type", "mime").ifBlank { if (streamUrl.contains(".m3u8", true)) "hls" else "mp4" })
    }
}
