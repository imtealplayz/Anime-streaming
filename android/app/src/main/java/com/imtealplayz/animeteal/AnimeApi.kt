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
import java.text.Normalizer
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.ConcurrentHashMap

data class AnimeItem(
    val id: String, val name: String, val poster: String, val type: String = "Anime",
    val episodes: Int = 0, val description: String = "", val rating: String = "",
    val searchTerms: List<String> = emptyList(),
)
data class AnimeDetail(
    val item: AnimeItem, val banner: String = "", val description: String = "",
    val status: String = "", val genres: List<String> = emptyList(),
    val studio: String = "", val aired: String = "", val duration: String = "",
)
data class EpisodeItem(val id: String, val number: Int, val title: String, val isFiller: Boolean = false)
data class EpisodeServer(val name: String, val category: String, val provider: String = name, val sources: List<StreamSource> = emptyList())
data class StreamSubtitle(
    val language: String,
    val url: String,
    val label: String = language,
    val type: String = "vtt",
)
data class StreamSource(
    val url: String, val quality: String, val headers: Map<String, String>,
    val subtitles: List<StreamSubtitle>, val type: String = "hls",
)
data class HomeFeed(
    val spotlight: List<AnimeItem>, val trending: List<AnimeItem>,
    val latest: List<AnimeItem>, val popular: List<AnimeItem>,
)
data class AnimeComment(
    val id: String,
    val content: String,
    val spoiler: Boolean,
    val displayName: String,
    val avatarUrl: String,
    val createdAt: String,
)

/** Fixed AnimeTeal service client; endpoint is app-owned, not user-editable. */
class AnimeApi {
    private val base = "https://api.aniraku.tech"
    // The website uses AniList official GraphQL first, with the managed backend as fallback.
    private val metadataBase = "https://graphql.anilist.co"
    private val userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    private val referer = "https://aniraku.tech/"
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .connectTimeout(25, TimeUnit.SECONDS).readTimeout(55, TimeUnit.SECONDS)
        .callTimeout(70, TimeUnit.SECONDS).build()
    private val metadataClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS).readTimeout(10, TimeUnit.SECONDS)
        .callTimeout(12, TimeUnit.SECONDS).retryOnConnectionFailure(true).build()

    private data class SearchCacheEntry(val savedAt: Long, val items: List<AnimeItem>)
    private val searchCache = ConcurrentHashMap<String, SearchCacheEntry>()
    private val detailCache = ConcurrentHashMap<String, Pair<Long, AnimeDetail>>()
    private val episodeCache = ConcurrentHashMap<String, Pair<Long, List<EpisodeItem>>>()

    private val searchAliases = mapOf(
        "aot" to "Attack on Titan",
        "snk" to "Attack on Titan",
        "fmab" to "Fullmetal Alchemist Brotherhood",
        "hxh" to "Hunter x Hunter",
        "jjk" to "Jujutsu Kaisen",
        "csm" to "Chainsaw Man",
        "mha" to "My Hero Academia",
        "bnha" to "My Hero Academia",
        "kimetsu" to "Demon Slayer",
        "ks" to "Kaguya-sama Love is War",
    )
    private val metadataCacheTtlMs = 10 * 60 * 1000L
    private val searchCacheTtlMs = 10 * 60 * 1000L

    private fun url(path: String, query: Map<String, String> = emptyMap()): String {
        val builder = (base + "/" + path.trimStart('/')).toHttpUrl().newBuilder()
        query.forEach { (key, value) -> builder.addQueryParameter(key, value) }
        return builder.build().toString()
    }

    private suspend fun raw(
        path: String,
        query: Map<String, String> = emptyMap(),
        body: JSONObject? = null,
        requestTimeoutMs: Long? = null,
    ): String = withContext(Dispatchers.IO) {
            val builder = Request.Builder().url(url(path, query))
                .header("Accept", "application/json").header("User-Agent", userAgent)
                .header("Referer", referer)
            if (body == null) builder.get() else builder.post(body.toString().toRequestBody(jsonType))
                .header("Content-Type", "application/json")
            val call = client.newCall(builder.build())
            requestTimeoutMs?.let { call.timeout().timeout(it, TimeUnit.MILLISECONDS) }
            call.execute().use { response ->
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

    private suspend fun obj(
        path: String,
        query: Map<String, String> = emptyMap(),
        body: JSONObject? = null,
        requestTimeoutMs: Long? = null,
    ): JSONObject {
        val text = raw(path, query, body, requestTimeoutMs)
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
    private suspend fun anilist(query: String, variables: JSONObject = JSONObject()): JSONObject {
        val payload = JSONObject().put("query", query).put("variables", variables)
        return try {
            val text = withContext(Dispatchers.IO) {
                val request = Request.Builder()
                    .url(metadataBase)
                    .header("Accept", "application/json")
                    .header("User-Agent", userAgent)
                    .header("Referer", referer)
                    .post(payload.toString().toRequestBody(jsonType))
                    .build()
                metadataClient.newCall(request).execute().use { response ->
                    val responseText = response.body?.string().orEmpty()
                    if (!response.isSuccessful) {
                        throw IOException("Anime catalogue mirror returned HTTP ${response.code}.")
                    }
                    if (responseText.isBlank()) throw IOException("Anime catalogue mirror returned an empty response.")
                    responseText
                }
            }
            graphData(JSONObject(text))
        } catch (mirrorError: Exception) {
            // Keep the managed backend as a compatibility fallback if the mirror is unavailable.
            try {
                graphData(obj("/api/v1/anilist", body = payload, requestTimeoutMs = 15_000L))
            } catch (fallbackError: Exception) {
                throw IOException("Anime catalogue is temporarily unavailable.", fallbackError)
            }
        }
    }

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
        val synonyms = o.optJSONArray("synonyms")
        val searchTerms = buildList {
            listOf(
                text(title, "english"),
                text(title, "romaji"),
                text(title, "native"),
                text(title, "userPreferred"),
            ).filter { it.isNotBlank() }.forEach(::add)
            if (synonyms != null) {
                for (i in 0 until synonyms.length()) {
                    synonyms.optString(i).trim().takeIf { it.isNotBlank() }?.let(::add)
                }
            }
        }.distinct()
        val score = o.optInt("averageScore", 0)
        return AnimeItem(
            id = text(o, "id"),
            name = text(title, "english", "romaji", "native").ifBlank { "Untitled anime" },
            poster = text(cover, "extraLarge", "large"),
            type = text(o, "format", "type").ifBlank { "Anime" },
            episodes = o.optInt("episodes", 0),
            description = clean(text(o, "description")),
            rating = if (score > 0) String.format("%.1f", score / 10.0) else "",
            searchTerms = searchTerms,
        )
    }

    private fun normalizeSearch(value: String): String =
        Normalizer.normalize(value, Normalizer.Form.NFKD)
            .lowercase(Locale.ROOT)
            .filter { it.isLetterOrDigit() }

    private fun searchRelevance(item: AnimeItem, query: String): Int {
        val normalizedQuery = normalizeSearch(query)
        if (normalizedQuery.isBlank()) return 0

        val titles = (listOf(item.name) + item.searchTerms).distinct()
        var best = 0
        for (title in titles) {
            val normalizedTitle = normalizeSearch(title)
            if (normalizedTitle.isBlank()) continue
            val score = when {
                normalizedTitle == normalizedQuery -> 1000
                normalizedTitle.startsWith(normalizedQuery) -> 850
                normalizedTitle.contains(normalizedQuery) -> 700
                else -> {
                    val queryWords = query.lowercase(Locale.ROOT)
                        .split(Regex("[^\\p{L}\\p{N}]+")).filter { it.isNotBlank() }
                    val titleWords = title.lowercase(Locale.ROOT)
                        .split(Regex("[^\\p{L}\\p{N}]+")).filter { it.isNotBlank() }
                    val allWordsMatch = queryWords.isNotEmpty() &&
                        queryWords.all { queryWord ->
                            titleWords.any { it.startsWith(queryWord) || it.contains(queryWord) }
                        }
                    val initials = titleWords.mapNotNull { it.firstOrNull() }.joinToString("")
                    when {
                        initials == normalizedQuery -> 650
                        allWordsMatch -> 500
                        else -> 0
                    }
                }
            }
            if (score > best) best = score
        }
        return best
    }

    private fun subtitleProxyUrl(rawUrl: String, headers: Map<String, String>): String {
        val source = rawUrl.trim()
        if (source.isBlank()) return source
        if (source.contains("/api/v1/proxy?")) return source

        val builder = base.toHttpUrl().newBuilder()
            .addPathSegments("api/v1/proxy")
            .addQueryParameter("url", source)
        if (headers.isNotEmpty()) {
            val headerJson = JSONObject().apply {
                headers.forEach { (key, value) -> put(key, value) }
            }
            builder.addQueryParameter("headers", headerJson.toString())
        }
        return builder.build().toString()
    }

    private fun subtitleType(item: JSONObject, url: String): String {
        val declared = text(item, "type", "format", "mime", "mimeType").lowercase()
        val extension = url.substringBefore('?').substringBefore('#').substringAfterLast('.', "").lowercase()
        return when {
            declared.contains("subrip") || declared == "srt" || extension == "srt" -> "srt"
            declared.contains("ssa") || declared.contains("ass") || extension == "ass" || extension == "ssa" -> "ass"
            declared.contains("ttml") || extension == "ttml" || extension == "xml" -> "ttml"
            else -> "vtt"
        }
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
        val normalizedQuery = query.trim().replace(Regex("\\s+"), " ")
        if (normalizedQuery.length < 2) return emptyList()

        val cacheKey = "${normalizeSearch(normalizedQuery)}:$page"
        val now = System.currentTimeMillis()
        val cached = searchCache[cacheKey]
        if (cached != null && now - cached.savedAt < searchCacheTtlMs) return cached.items

        val canonicalQuery = searchAliases[normalizeSearch(normalizedQuery)] ?: normalizedQuery
        val gql = """
            query (${'$'}search: String!, ${'$'}page: Int!) {
              Page(page: ${'$'}page, perPage: 50) {
                pageInfo { hasNextPage currentPage }
                media(
                  search: ${'$'}search,
                  type: ANIME,
                  sort: [SEARCH_MATCH, POPULARITY_DESC],
                  isAdult: false
                ) {
                  id
                  title { romaji english native userPreferred }
                  synonyms
                  coverImage { extraLarge large }
                  format
                  episodes
                  description
                  averageScore
                  isAdult
                }
              }
            }
        """.trimIndent()

        return try {
            val data = anilist(gql, JSONObject().put("search", canonicalQuery).put("page", page))
            val items = cards(data.optJSONObject("Page")?.optJSONArray("media"))
                .filter { it.id.isNotBlank() && it.poster.isNotBlank() }
                .distinctBy { it.id }
                .map { it to searchRelevance(it, canonicalQuery) }
                .filter { it.second > 0 }
                .sortedWith(
                    compareByDescending<Pair<AnimeItem, Int>> { it.second }
                        .thenByDescending { it.first.rating.toFloatOrNull() ?: 0f }
                )
                .map { it.first }

            searchCache[cacheKey] = SearchCacheEntry(now, items)
            if (searchCache.size > 60) {
                val oldest = searchCache.entries.sortedBy { it.value.savedAt }.take(searchCache.size - 50)
                oldest.forEach { searchCache.remove(it.key, it.value) }
            }
            items
        } catch (error: Exception) {
            // Keep the last successful query result during a brief upstream outage.
            cached?.items ?: throw error
        }
    }

    suspend fun detail(animeId: String): AnimeDetail {
        val id = animeId.toLongOrNull() ?: throw IOException("This anime has an invalid catalogue ID.")
        detailCache[id.toString()]?.takeIf { System.currentTimeMillis() - it.first < metadataCacheTtlMs }?.let { return it.second }
        val media = obj("/api/v1/anime/$id").let { it.optJSONObject("data") ?: it.optJSONObject("anime") ?: it }
        val cover = media.optJSONObject("coverImage")
        val genresArray = media.optJSONArray("genres")
        val genres = if (genresArray == null) emptyList() else buildList {
            for (i in 0 until genresArray.length()) genresArray.optString(i).takeIf { it.isNotBlank() }?.let(::add)
        }
        val studios = media.optJSONObject("studios")?.optJSONArray("nodes")
        val year = media.optJSONObject("startDate")?.optInt("year", 0) ?: 0
        val duration = media.optInt("duration", 0)
        val result = AnimeDetail(
            item = card(media),
            banner = text(media, "bannerImage").ifBlank { text(cover, "extraLarge", "large") },
            description = clean(text(media, "description")),
            status = text(media, "status").lowercase().replace('_', ' ').replaceFirstChar { it.uppercase() },
            genres = genres,
            studio = studios?.optJSONObject(0)?.optString("name").orEmpty(),
            aired = year.takeIf { it > 0 }?.toString().orEmpty(),
            duration = duration.takeIf { it > 0 }?.let { "$it min/ep" }.orEmpty(),
        )
        detailCache[id.toString()] = System.currentTimeMillis() to result
        return result
    }

    suspend fun episodes(animeId: String): List<EpisodeItem> {
        val id = animeId.toLongOrNull() ?: throw IOException("This anime has an invalid catalogue ID.")
        episodeCache[id.toString()]?.takeIf { System.currentTimeMillis() - it.first < metadataCacheTtlMs }?.let { return it.second }
        val data = obj("/api/v1/anime/$id/episodes").let { it.optJSONObject("data") ?: it }
        val a = data.optJSONArray("episodes") ?: JSONArray()
        return buildList {
            for (i in 0 until a.length()) {
                val item = a.optJSONObject(i) ?: continue
                val n = item.optInt("number", i + 1)
                if (n > 0) add(EpisodeItem("$id:$n", n, text(item, "title").ifBlank { "Episode $n" },
                    item.optBoolean("isFiller", item.optBoolean("filler", false))))
            }
        }.sortedBy { it.number }.also {
            episodeCache[id.toString()] = System.currentTimeMillis() to it
        }
    }

    private fun episodeKey(key: String): Pair<Long, Int> {
        val parts = key.split(":", limit = 2)
        val id = parts.getOrNull(0)?.toLongOrNull()
        val ep = parts.getOrNull(1)?.toIntOrNull()
        if (id == null || ep == null || id <= 0 || ep <= 0)
            throw IOException("This saved episode uses an older source ID. Open the anime and select the episode again.")
        return id to ep
    }

    suspend fun servers(
        episodeId: String,
        category: String,
        refresh: Boolean = false,
    ): List<EpisodeServer> {
        val (id, ep) = episodeKey(episodeId)
        val query = mutableMapOf(
            "animeId" to id.toString(),
            "episode" to ep.toString(),
            "lang" to category,
        )
        if (refresh) query["refresh"] = "1"
        val a = array("/api/v1/servers", query)
        return buildList {
            for (i in 0 until a.length()) {
                val item = a.optJSONObject(i) ?: continue
                val provider = text(item, "provider")
                val name = text(item, "name", "provider")
                if (provider.isBlank() || name.isBlank()) continue
                val headers = linkedMapOf("User-Agent" to userAgent, "Referer" to referer)
                item.optJSONObject("headers")?.let { h ->
                    h.keys().forEach { key -> h.optString(key).takeIf { it.isNotBlank() }?.let { headers[key] = it } }
                }
                val sourceArray = item.optJSONArray("sources") ?: JSONArray()
                val playableSources = buildList {
                    for (sourceIndex in 0 until sourceArray.length()) {
                        val source = sourceArray.optJSONObject(sourceIndex) ?: continue
                        val sourceUrl = text(source, "url")
                        val sourceType = text(source, "type", "mime").lowercase()
                        val verdict = text(source, "verification", "Verification").lowercase()
                        val isNative = sourceType.contains("hls") || sourceType.contains("mpegurl") ||
                            sourceType.contains("mp4") || sourceUrl.contains(".m3u8", true) || sourceUrl.contains(".mp4", true)
                        if (sourceUrl.isBlank() || verdict == "dead" || verdict == "embed" || !isNative) continue
                        val subtitleArray = source.optJSONArray("subtitles") ?: JSONArray()
                        val subtitles = buildList {
                            for (subtitleIndex in 0 until subtitleArray.length()) {
                                val subtitle = subtitleArray.optJSONObject(subtitleIndex) ?: continue
                                val subtitleUrl = text(subtitle, "url", "file")
                                if (subtitleUrl.isNotBlank()) {
                                    val language = text(subtitle, "lang", "language").ifBlank {
                                        text(subtitle, "label").ifBlank { "Subtitle" }
                                    }
                                    add(
                                        StreamSubtitle(
                                            language = language,
                                            url = subtitleProxyUrl(subtitleUrl, headers),
                                            label = text(subtitle, "label").ifBlank { language },
                                            type = subtitleType(subtitle, subtitleUrl),
                                        )
                                    )
                                }
                            }
                        }
                        add(StreamSource(sourceUrl, text(source, "quality").ifBlank { "Auto" }, headers, subtitles,
                            text(source, "type", "mime").ifBlank { if (sourceUrl.contains(".m3u8", true)) "hls" else "mp4" }))
                    }
                }
                add(EpisodeServer(name, category, provider, playableSources))
            }
        }.distinctBy { it.provider }
    }

    /**
     * Resolve with the backend automatic provider fallback chain.
     * This avoids /servers discovery followed by serial requests to every provider.
     */
    suspend fun sourceAuto(episodeId: String, category: String): StreamSource =
        resolveStream(episodeId, null, category)

    suspend fun source(episodeId: String, provider: String, category: String): StreamSource =
        resolveStream(episodeId, provider, category, requestTimeoutMs = 6_000L)

    private suspend fun resolveStream(
        episodeId: String,
        provider: String?,
        category: String,
        requestTimeoutMs: Long? = null,
    ): StreamSource {
        val (id, ep) = episodeKey(episodeId)
        val request = JSONObject().put("animeId", id).put("episode", ep)
            .put("lang", category).put("quality", "auto")
        if (!provider.isNullOrBlank()) request.put("provider", provider)
        val data = obj("/api/v1/stream", body = request, requestTimeoutMs = requestTimeoutMs)
            .let { it.optJSONObject("data") ?: it }
        val sources = data.optJSONArray("sources") ?: JSONArray()
        val chosen = (0 until sources.length()).mapNotNull { sources.optJSONObject(it) }.firstOrNull { item ->
            val u = text(item, "url")
            val t = text(item, "type", "mime").lowercase()
            val verdict = text(item, "verification", "Verification").lowercase()
            u.isNotBlank() && verdict != "dead" && verdict != "embed" &&
                (t.contains("hls") || t.contains("mpegurl") || t.contains("mp4") ||
                    u.contains(".m3u8", true) || u.contains(".mp4", true))
        } ?: throw IOException("No playable HLS or MP4 source was returned by the available providers.")

        val headers = linkedMapOf("User-Agent" to userAgent, "Referer" to referer)
        data.optJSONObject("headers")?.let { h ->
            h.keys().forEach { key -> h.optString(key).takeIf { it.isNotBlank() }?.let { headers[key] = it } }
        }
        val subArray = chosen.optJSONArray("subtitles") ?: data.optJSONArray("subtitles") ?: JSONArray()
        val subtitles = buildList {
            for (i in 0 until subArray.length()) {
                val item = subArray.optJSONObject(i) ?: continue
                val u = text(item, "url", "file")
                if (u.isNotBlank()) {
                    val language = text(item, "lang", "language").ifBlank {
                        text(item, "label").ifBlank { "Subtitle" }
                    }
                    add(
                        StreamSubtitle(
                            language = language,
                            url = subtitleProxyUrl(u, headers),
                            label = text(item, "label").ifBlank { language },
                            type = subtitleType(item, u),
                        )
                    )
                }
            }
        }
        val streamUrl = text(chosen, "url")
        return StreamSource(
            streamUrl,
            text(chosen, "quality").ifBlank { "Auto" },
            headers,
            subtitles,
            text(chosen, "type", "mime").ifBlank { if (streamUrl.contains(".m3u8", true)) "hls" else "mp4" },
        )
    }

    suspend fun animeComments(animeId: String): List<AnimeComment> = withContext(Dispatchers.IO) {
        val url = "https://animeteal.vercel.app/api/comments".toHttpUrl()
            .newBuilder()
            .addQueryParameter("animeId", animeId)
            .build()
        val request = Request.Builder().url(url).get().header("Accept", "application/json").build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val message = try { JSONObject(raw).optString("error") } catch (_: Exception) { "" }
                throw IOException(message.ifBlank { "Comments could not be loaded." })
            }
            val items = JSONObject(raw).optJSONArray("items") ?: JSONArray()
            buildList {
                for (i in 0 until items.length()) {
                    val item = items.optJSONObject(i) ?: continue
                    add(
                        AnimeComment(
                            id = item.optString("id"),
                            content = item.optString("content"),
                            spoiler = item.optBoolean("spoiler"),
                            displayName = item.optString("displayName", "AnimeTeal user"),
                            avatarUrl = item.optString("avatarUrl"),
                            createdAt = item.optString("createdAt"),
                        )
                    )
                }
            }
        }
    }

    suspend fun postAnimeComment(
        animeId: String,
        animeTitle: String,
        content: String,
        spoiler: Boolean,
        accessToken: String,
    ): AnimeComment = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("animeId", animeId)
            .put("animeTitle", animeTitle)
            .put("content", content)
            .put("spoiler", spoiler)
        val request = Request.Builder()
            .url("https://animeteal.vercel.app/api/comments")
            .post(payload.toString().toRequestBody(jsonType))
            .header("Accept", "application/json")
            .header("Authorization", "Bearer $accessToken")
            .build()
        client.newCall(request).execute().use { response ->
            val raw = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val message = try { JSONObject(raw).optString("error") } catch (_: Exception) { "" }
                throw IOException(message.ifBlank { "Your comment could not be posted." })
            }
            val item = JSONObject(raw).optJSONObject("item")
                ?: throw IOException("AnimeTeal returned an invalid comment.")
            AnimeComment(
                id = item.optString("id"),
                content = item.optString("content"),
                spoiler = item.optBoolean("spoiler"),
                displayName = item.optString("displayName", "AnimeTeal user"),
                avatarUrl = item.optString("avatarUrl"),
                createdAt = item.optString("createdAt"),
            )
        }
    }

}
