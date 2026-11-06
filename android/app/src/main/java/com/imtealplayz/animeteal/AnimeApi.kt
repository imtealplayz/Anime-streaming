package com.imtealplayz.animeteal

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class AnimeItem(
    val id: String,
    val name: String,
    val poster: String,
    val type: String = "Anime",
    val episodes: Int = 0,
    val description: String = "",
    val rating: String = "",
)

data class AnimeDetail(
    val item: AnimeItem,
    val banner: String = "",
    val description: String = "",
    val status: String = "",
    val genres: List<String> = emptyList(),
    val studio: String = "",
    val aired: String = "",
    val duration: String = "",
)

data class EpisodeItem(
    val id: String,
    val number: Int,
    val title: String,
    val isFiller: Boolean = false,
)

data class EpisodeServer(val name: String, val category: String)
data class StreamSubtitle(val language: String, val url: String)
data class StreamSource(
    val url: String,
    val quality: String,
    val headers: Map<String, String>,
    val subtitles: List<StreamSubtitle>,
)
data class HomeFeed(
    val spotlight: List<AnimeItem>,
    val trending: List<AnimeItem>,
    val latest: List<AnimeItem>,
    val popular: List<AnimeItem>,
)

class AnimeApi(baseUrl: String) {
    private val base = baseUrl.trim().trimEnd('/')
    private val client = OkHttpClient.Builder()
        .connectTimeout(25, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .callTimeout(60, TimeUnit.SECONDS)
        .build()

    private fun url(path: String, query: Map<String, String> = emptyMap()): String {
        val builder = (base + "/" + path.trimStart('/')).toHttpUrl().newBuilder()
        query.forEach { (key, value) -> builder.addQueryParameter(key, value) }
        return builder.build().toString()
    }

    private suspend fun get(path: String, query: Map<String, String> = emptyMap()): JSONObject =
        withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url(url(path, query))
                .header("Accept", "application/json")
                .header("User-Agent", "AnimeTeal-Android/2.0")
                .get()
                .build()

            client.newCall(request).execute().use { response ->
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val detail = try {
                        JSONObject(body).optString("message")
                    } catch (_: Exception) {
                        body.take(160)
                    }
                    throw IOException(
                        "API returned HTTP ${response.code}" +
                            if (detail.isNotBlank()) ": $detail" else ""
                    )
                }
                try {
                    JSONObject(body)
                } catch (error: Exception) {
                    throw IOException("The API returned an unreadable response.", error)
                }
            }
        }

    private fun payload(root: JSONObject): JSONObject =
        root.optJSONObject("data") ?: root.optJSONObject("results") ?: root

    private fun firstText(obj: JSONObject?, vararg keys: String): String {
        if (obj == null) return ""
        for (key in keys) {
            val value = obj.opt(key)
            if (value != null && value != JSONObject.NULL) {
                val text = value.toString().trim()
                if (text.isNotEmpty() && text != "null") return text
            }
        }
        return ""
    }

    private fun parseCard(obj: JSONObject): AnimeItem {
        val episodeInfo = obj.optJSONObject("episodes")
        return AnimeItem(
            id = firstText(obj, "id", "animeId", "slug"),
            name = firstText(obj, "name", "title", "jname").ifBlank { "Untitled anime" },
            poster = firstText(obj, "poster", "image", "coverImage"),
            type = firstText(obj, "type", "format").ifBlank { "Anime" },
            episodes = episodeInfo?.optInt("sub", 0)?.takeIf { it > 0 }
                ?: episodeInfo?.optInt("dub", 0)
                ?: obj.optInt("episodes", 0),
            description = firstText(obj, "description", "synopsis"),
            rating = firstText(obj, "rating", "score", "malscore"),
        )
    }

    private fun parseCards(array: JSONArray?): List<AnimeItem> {
        if (array == null) return emptyList()
        return buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                val card = parseCard(item)
                if (card.id.isNotBlank()) add(card)
            }
        }
    }

    suspend fun home(): HomeFeed {
        val data = payload(get("/home"))
        return HomeFeed(
            spotlight = parseCards(data.optJSONArray("spotlightAnimes")),
            trending = parseCards(data.optJSONArray("trendingAnimes")),
            latest = parseCards(data.optJSONArray("latestEpisodeAnimes")),
            popular = parseCards(data.optJSONArray("mostPopularAnimes")),
        )
    }

    suspend fun search(query: String, page: Int = 1): List<AnimeItem> {
        val data = payload(get("/search", mapOf("q" to query, "page" to page.toString())))
        return parseCards(data.optJSONArray("animes"))
    }

    suspend fun detail(animeId: String): AnimeDetail {
        val data = payload(get("/anime/$animeId"))
        val anime = data.optJSONObject("anime") ?: data
        val info = anime.optJSONObject("info") ?: anime
        val more = anime.optJSONObject("moreInfo") ?: data.optJSONObject("moreInfo")
        val stats = info.optJSONObject("stats")
        val baseItem = AnimeItem(
            id = firstText(info, "id").ifBlank { animeId },
            name = firstText(info, "name", "title").ifBlank { "Untitled anime" },
            poster = firstText(info, "poster"),
            type = firstText(stats, "type").ifBlank { "Anime" },
            episodes = stats?.optJSONObject("episodes")?.let {
                maxOf(it.optInt("sub", 0), it.optInt("dub", 0))
            } ?: 0,
            description = firstText(info, "description"),
            rating = firstText(stats, "rating"),
        )
        val genresArray = more?.optJSONArray("genres")
        val genres = if (genresArray == null) emptyList() else buildList {
            for (index in 0 until genresArray.length()) {
                genresArray.optString(index).takeIf { it.isNotBlank() }?.let(::add)
            }
        }

        return AnimeDetail(
            item = baseItem,
            banner = firstText(info, "poster", "banner"),
            description = baseItem.description,
            status = firstText(more, "status"),
            genres = genres,
            studio = firstText(more, "studios"),
            aired = firstText(more, "aired"),
            duration = firstText(more, "duration").ifBlank { firstText(stats, "duration") },
        )
    }

    suspend fun episodes(animeId: String): List<EpisodeItem> {
        val data = payload(get("/anime/$animeId/episodes"))
        val array = data.optJSONArray("episodes") ?: JSONArray()
        return buildList {
            for (index in 0 until array.length()) {
                val obj = array.optJSONObject(index) ?: continue
                val id = firstText(obj, "episodeId", "id")
                if (id.isBlank()) continue
                val number = obj.optInt("number", index + 1)
                add(
                    EpisodeItem(
                        id = id,
                        number = number,
                        title = firstText(obj, "title").ifBlank { "Episode $number" },
                        isFiller = obj.optBoolean("isFiller", false),
                    )
                )
            }
        }.sortedBy { it.number }
    }

    suspend fun servers(episodeId: String, category: String): List<EpisodeServer> {
        val data = payload(get("/episode/servers", mapOf("animeEpisodeId" to episodeId)))
        val array = data.optJSONArray(category) ?: JSONArray()
        return buildList {
            for (index in 0 until array.length()) {
                val obj = array.optJSONObject(index) ?: continue
                val name = firstText(obj, "serverName", "name")
                if (name.isNotBlank()) add(EpisodeServer(name, category))
            }
        }
    }

    suspend fun source(episodeId: String, server: String, category: String): StreamSource {
        val data = payload(
            get("/episode/sources", mapOf(
                "animeEpisodeId" to episodeId,
                "server" to server,
                "category" to category,
            ))
        )

        val sources = data.optJSONArray("sources") ?: JSONArray()
        val playable = (0 until sources.length())
            .mapNotNull { sources.optJSONObject(it) }
            .mapNotNull { obj ->
                val sourceUrl = firstText(obj, "url", "file")
                if (sourceUrl.isBlank()) null else sourceUrl to firstText(obj, "quality", "label").ifBlank { "Auto" }
            }
            .firstOrNull()
            ?: throw IOException("This server did not return a playable stream.")

        val headerObject = data.optJSONObject("headers")
        val headers = mutableMapOf<String, String>()
        headerObject?.keys()?.forEach { key ->
            val value = headerObject.optString(key)
            if (value.isNotBlank()) headers[key] = value
        }

        val subtitlesArray = data.optJSONArray("subtitles") ?: data.optJSONArray("tracks") ?: JSONArray()
        val subtitles = buildList {
            for (index in 0 until subtitlesArray.length()) {
                val obj = subtitlesArray.optJSONObject(index) ?: continue
                val subUrl = firstText(obj, "url", "file")
                if (subUrl.isNotBlank()) {
                    add(StreamSubtitle(
                        language = firstText(obj, "lang", "label").ifBlank { "Subtitle" },
                        url = subUrl,
                    ))
                }
            }
        }

        return StreamSource(playable.first, playable.second, headers, subtitles)
    }
}
