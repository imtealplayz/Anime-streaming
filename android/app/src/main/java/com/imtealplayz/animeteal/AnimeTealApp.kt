package com.imtealplayz.animeteal

import android.content.Context
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private val AppBg = Color(0xFF07090E)
private val Panel = Color(0xFF0D141B)
private val Panel2 = Color(0xFF111C25)
private val Teal = Color(0xFF2DD4BF)
private val Muted = Color(0xFF9AAAB4)

private enum class MainTab { HOME, SEARCH, LIBRARY, SETTINGS }

private data class WatchEntry(
    val anime: AnimeItem,
    val episode: EpisodeItem,
    val positionMs: Long,
)

private data class PlaybackSession(
    val anime: AnimeItem,
    val episode: EpisodeItem,
    val stream: StreamSource,
    val alternatives: List<StreamSource>,
    val category: String,
    val initialPositionMs: Long,
)

private class LocalLibrary(context: Context) {
    private val prefs = context.getSharedPreferences("animeteal_native", Context.MODE_PRIVATE)

    init {
        // Clear the old user-editable endpoint preference from previous builds.
        prefs.edit().remove("api_base").apply()
    }

    fun favorites(): List<AnimeItem> = readCards("favorites")

    fun toggleFavorite(item: AnimeItem): List<AnimeItem> {
        val items = favorites().toMutableList()
        val index = items.indexOfFirst { it.id == item.id }
        if (index >= 0) items.removeAt(index) else items.add(0, item)
        saveCards("favorites", items)
        return items
    }

    fun history(): List<WatchEntry> {
        val array = try {
            JSONArray(prefs.getString("history", "[]") ?: "[]")
        } catch (_: Exception) {
            JSONArray()
        }
        return buildList {
            for (index in 0 until array.length()) {
                val obj = array.optJSONObject(index) ?: continue
                val anime = obj.optJSONObject("anime") ?: continue
                val episode = obj.optJSONObject("episode") ?: continue
                add(
                    WatchEntry(
                        anime = cardFromJson(anime),
                        episode = EpisodeItem(
                            id = episode.optString("id"),
                            number = episode.optInt("number", 1),
                            title = episode.optString("title", "Episode"),
                        ),
                        positionMs = obj.optLong("positionMs", 0L),
                    )
                )
            }
        }
    }

    fun saveProgress(anime: AnimeItem, episode: EpisodeItem, positionMs: Long) {
        val existing = history().toMutableList()
        val index = existing.indexOfFirst { it.anime.id == anime.id }
        if (index >= 0) existing.removeAt(index)
        existing.add(0, WatchEntry(anime, episode, positionMs))
        val array = JSONArray()
        existing.take(30).forEach { item ->
            array.put(
                JSONObject()
                    .put("anime", cardToJson(item.anime))
                    .put(
                        "episode",
                        JSONObject()
                            .put("id", item.episode.id)
                            .put("number", item.episode.number)
                            .put("title", item.episode.title)
                    )
                    .put("positionMs", item.positionMs)
            )
        }
        prefs.edit().putString("history", array.toString()).apply()
    }

    private fun readCards(key: String): List<AnimeItem> {
        val array = try {
            JSONArray(prefs.getString(key, "[]") ?: "[]")
        } catch (_: Exception) {
            JSONArray()
        }
        return buildList {
            for (index in 0 until array.length()) {
                array.optJSONObject(index)?.let { add(cardFromJson(it)) }
            }
        }
    }

    private fun saveCards(key: String, cards: List<AnimeItem>) {
        val array = JSONArray()
        cards.forEach { array.put(cardToJson(it)) }
        prefs.edit().putString(key, array.toString()).apply()
    }

    private fun cardToJson(item: AnimeItem) = JSONObject()
        .put("id", item.id)
        .put("name", item.name)
        .put("poster", item.poster)
        .put("type", item.type)
        .put("episodes", item.episodes)
        .put("description", item.description)
        .put("rating", item.rating)

    private fun cardFromJson(obj: JSONObject) = AnimeItem(
        id = obj.optString("id"),
        name = obj.optString("name"),
        poster = obj.optString("poster"),
        type = obj.optString("type", "Anime"),
        episodes = obj.optInt("episodes", 0),
        description = obj.optString("description"),
        rating = obj.optString("rating"),
    )
}

@Composable
fun AnimeTealApp() {
    val context = LocalContext.current
    val library = remember { LocalLibrary(context) }
    val api = remember { AnimeApi() }

    var tab by remember { mutableStateOf(MainTab.HOME) }
    var selectedAnime by remember { mutableStateOf<AnimeItem?>(null) }
    var playerState by remember { mutableStateOf<PlaybackSession?>(null) }
    var resolving by remember { mutableStateOf(false) }
    var resolvingMessage by remember { mutableStateOf("Connecting to anime providers…") }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val favorites = remember { mutableStateListOf<AnimeItem>().apply { addAll(library.favorites()) } }
    val history = remember { mutableStateListOf<WatchEntry>().apply { addAll(library.history()) } }
    val scope = rememberCoroutineScope()

    fun toggleFavorite(item: AnimeItem) {
        val updated = library.toggleFavorite(item)
        favorites.clear()
        favorites.addAll(updated)
    }

    fun startEpisode(
        anime: AnimeItem,
        episode: EpisodeItem,
        category: String = "sub",
        resumePositionMs: Long? = null,
    ) {
        scope.launch {
            resolving = true
            errorMessage = null
            try {
                // /servers already performs the backend's concurrent provider fan-out
                // and returns source URLs ready for native Media3 playback. Avoid
                // adding a 6-second single-provider timeout before that request.
                resolvingMessage = "Finding playable ${category.uppercase()} sources…"
                val discovered = api.servers(episode.id, category)
                var candidates = discovered
                    .asSequence()
                    .flatMap { it.sources.asSequence() }
                    .filter { source ->
                        val type = source.type.lowercase()
                        source.url.startsWith("https://") &&
                            (type.contains("hls") || type.contains("mpegurl") ||
                                type.contains("mp4") || source.url.contains(".m3u8", true) ||
                                source.url.contains(".mp4", true))
                    }
                    .distinctBy { it.url }
                    .toList()

                // /stream is the last-resort backend fallback chain, used only
                // when concurrent provider discovery finds no native source.
                if (candidates.isEmpty()) {
                    resolvingMessage = "Trying automatic provider fallback…"
                    candidates = listOf(api.sourceAuto(episode.id, category))
                }

                val first = candidates.firstOrNull()
                    ?: throw IllegalStateException(
                        "No playable ${category.uppercase()} stream is currently available for this episode."
                    )
                resolvingMessage = "Preparing AnimeTeal Player…"
                val savedPositionMs = (resumePositionMs ?: history.firstOrNull {
                    it.anime.id == anime.id && it.episode.id == episode.id
                }?.positionMs ?: 0L).coerceAtLeast(0L)

                library.saveProgress(anime, episode, savedPositionMs)
                history.clear()
                history.addAll(library.history())
                playerState = PlaybackSession(
                    anime = anime,
                    episode = episode,
                    stream = first,
                    alternatives = candidates.drop(1),
                    category = category,
                    initialPositionMs = savedPositionMs,
                )
            } catch (e: Exception) {
                errorMessage = e.message ?: "Unable to resolve this episode."
                if (playerState == null) tab = MainTab.HOME
            } finally {
                resolving = false
            }
        }
    }

    BackHandler(enabled = playerState != null || selectedAnime != null || tab != MainTab.HOME) {
        when {
            playerState != null -> playerState = null
            selectedAnime != null -> selectedAnime = null
            else -> tab = MainTab.HOME
        }
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Teal,
            onPrimary = Color(0xFF05201D),
            secondary = Color(0xFF67E8F9),
            background = AppBg,
            surface = Panel,
            onBackground = Color(0xFFF2F6F7),
            onSurface = Color(0xFFF2F6F7),
        )
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = AppBg) {
            when {
                playerState != null -> {
                    val state = playerState!!
                    NativePlayerScreen(
                        anime = state.anime,
                        episode = state.episode,
                        stream = state.stream,
                        category = state.category,
                        initialPositionMs = state.initialPositionMs,
                        hasAlternateSource = state.alternatives.isNotEmpty(),
                        isResolvingLanguage = resolving,
                        resolveError = errorMessage,
                        onDismissResolveError = { errorMessage = null },
                        onBack = { playerState = null },
                        onProgress = { position ->
                            library.saveProgress(state.anime, state.episode, position)
                            history.clear()
                            history.addAll(library.history())
                        },
                        onTryNextSource = { position ->
                            val next = state.alternatives.firstOrNull()
                            if (next != null) {
                                playerState = state.copy(
                                    stream = next,
                                    alternatives = state.alternatives.drop(1),
                                    initialPositionMs = position.coerceAtLeast(0L),
                                )
                            }
                        },
                        onChangeLanguage = { nextCategory, position ->
                            if (nextCategory != state.category) {
                                startEpisode(state.anime, state.episode, nextCategory, position)
                            }
                        },
                        onRetry = { position ->
                            startEpisode(state.anime, state.episode, state.category, position)
                        },
                    )
                }
                selectedAnime != null -> {
                    AnimeDetailScreen(
                        api = api,
                        anime = selectedAnime!!,
                        isFavorite = favorites.any { it.id == selectedAnime!!.id },
                        onBack = { selectedAnime = null },
                        onFavorite = { toggleFavorite(selectedAnime!!) },
                        onPlay = { episode, category -> startEpisode(selectedAnime!!, episode, category) },
                    )
                }
                else -> {
                    Scaffold(
                        containerColor = AppBg,
                        bottomBar = {
                            NavigationBar(containerColor = Color(0xFF0A1117)) {
                                NavigationBarItem(
                                    selected = tab == MainTab.HOME,
                                    onClick = { tab = MainTab.HOME },
                                    icon = { Icon(Icons.Filled.Home, contentDescription = null) },
                                    label = { Text("Home") },
                                    colors = navColors(),
                                )
                                NavigationBarItem(
                                    selected = tab == MainTab.SEARCH,
                                    onClick = { tab = MainTab.SEARCH },
                                    icon = { Icon(Icons.Filled.Search, contentDescription = null) },
                                    label = { Text("Search") },
                                    colors = navColors(),
                                )
                                NavigationBarItem(
                                    selected = tab == MainTab.LIBRARY,
                                    onClick = { tab = MainTab.LIBRARY },
                                    icon = { Icon(Icons.Filled.Favorite, contentDescription = null) },
                                    label = { Text("Library") },
                                    colors = navColors(),
                                )
                                NavigationBarItem(
                                    selected = tab == MainTab.SETTINGS,
                                    onClick = { tab = MainTab.SETTINGS },
                                    icon = { Icon(Icons.Filled.Settings, contentDescription = null) },
                                    label = { Text("Settings") },
                                    colors = navColors(),
                                )
                            }
                        }
                    ) { padding ->
                        Box(Modifier.fillMaxSize().padding(padding)) {
                            when (tab) {
                                MainTab.HOME -> HomeScreen(api, { selectedAnime = it }, { tab = MainTab.SEARCH })
                                MainTab.SEARCH -> SearchScreen(api, { selectedAnime = it })
                                MainTab.LIBRARY -> LibraryScreen(
                                    favorites = favorites,
                                    history = history,
                                    onAnimeClick = { selectedAnime = it },
                                    onResume = { startEpisode(it.anime, it.episode) },
                                )
                                MainTab.SETTINGS -> SettingsScreen()
                            }
                            if (resolving || errorMessage != null) {
                                ResolveOverlay(resolving, errorMessage, { errorMessage = null }, resolvingMessage)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun navColors() = NavigationBarItemDefaults.colors(
    selectedIconColor = Teal,
    selectedTextColor = Teal,
    indicatorColor = Color(0xFF153A3A),
    unselectedIconColor = Muted,
    unselectedTextColor = Muted,
)

@Composable
private fun AppHeader(
    title: String = "AnimeTeal",
    trailing: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column {
            Text(title, fontSize = 24.sp, fontWeight = FontWeight.Black, color = Color.White, letterSpacing = (-0.5).sp)
            if (title == "AnimeTeal") Text("Discover • Watch • Enjoy", fontSize = 10.sp, color = Muted)
        }
        Row(content = trailing)
    }
}

@Composable
private fun HomeScreen(api: AnimeApi, onAnimeClick: (AnimeItem) -> Unit, onSearchClick: () -> Unit) {
    var feed by remember(api) { mutableStateOf<HomeFeed?>(null) }
    var loading by remember(api) { mutableStateOf(true) }
    var error by remember(api) { mutableStateOf<String?>(null) }
    var refreshKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(api, refreshKey) {
        loading = true
        error = null
        try {
            feed = api.home()
        } catch (e: Exception) {
            error = e.message ?: "Could not load anime."
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppHeader {
            TextButton(onClick = onSearchClick) {
                Icon(Icons.Filled.Search, contentDescription = "Search", tint = Teal)
                Spacer(Modifier.width(4.dp))
                Text("Search", color = Teal)
            }
        }
        if (loading) {
            LoadingHome()
        } else if (feed == null) {
            ErrorPanel(error ?: "No catalogue data was returned.") { refreshKey++ }
        } else {
            val data = feed!!
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(22.dp),
            ) {
                if (data.spotlight.isNotEmpty()) item { SpotlightCard(data.spotlight.first(), onAnimeClick) }
                if (data.trending.isNotEmpty()) item { AnimeRail("Trending now", data.trending, onAnimeClick) }
                if (data.latest.isNotEmpty()) item { AnimeRail("Recently updated", data.latest, onAnimeClick) }
                if (data.popular.isNotEmpty()) item { AnimeRail("Most popular", data.popular, onAnimeClick) }
                if (data.spotlight.isEmpty() && data.trending.isEmpty() && data.latest.isEmpty()) {
                    item { ErrorPanel("The API connected, but its home response was empty.") { refreshKey++ } }
                }
            }
        }
    }
}

@Composable
private fun LoadingHome() {
    Column(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Box(Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(22.dp)).background(Panel2))
        repeat(3) { Box(Modifier.fillMaxWidth().height(155.dp).clip(RoundedCornerShape(18.dp)).background(Panel)) }
    }
}

@Composable
private fun SpotlightCard(item: AnimeItem, onClick: (AnimeItem) -> Unit) {
    Box(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).height(260.dp)
            .clip(RoundedCornerShape(22.dp)).background(Panel2).clickable { onClick(item) }
    ) {
        AsyncImage(model = item.poster, contentDescription = item.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xE607090E), AppBg))))
        Column(Modifier.align(Alignment.BottomStart).padding(18.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text("FEATURED", color = Teal, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
            Text(item.name, color = Color.White, fontSize = 25.sp, fontWeight = FontWeight.Black, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                listOf(item.type, item.episodes.takeIf { it > 0 }?.let { "$it episodes" }).filterNotNull().joinToString("  •  "),
                color = Color(0xFFD5E0E3),
                fontSize = 12.sp,
            )
            Surface(color = Teal, shape = RoundedCornerShape(10.dp)) {
                Text("View anime  →", modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp), color = Color(0xFF05201D), fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun AnimeRail(title: String, items: List<AnimeItem>, onAnimeClick: (AnimeItem) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(title, color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text("AnimeTeal", color = Muted, fontSize = 10.sp)
        }
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            items(items, key = { it.id }) { item ->
                PosterCard(item = item, onClick = { onAnimeClick(item) })
            }
        }
    }
}

@Composable
private fun PosterCard(item: AnimeItem, onClick: () -> Unit) {
    Column(Modifier.width(116.dp).clickable(onClick = onClick), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.width(116.dp).height(158.dp).clip(RoundedCornerShape(13.dp)).background(Panel2)) {
            AsyncImage(model = item.poster, contentDescription = item.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            if (item.type.isNotBlank()) {
                Surface(modifier = Modifier.align(Alignment.TopStart).padding(6.dp), color = Color(0xB8000000), shape = RoundedCornerShape(5.dp)) {
                    Text(item.type, color = Color.White, fontSize = 9.sp, modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                }
            }
        }
        Text(item.name, color = Color(0xFFE8F0F2), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, minLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 15.sp)
    }
}

@Composable
private fun SearchScreen(api: AnimeApi, onAnimeClick: (AnimeItem) -> Unit) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<AnimeItem>>(emptyList()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(query, api) {
        if (query.trim().length < 2) {
            results = emptyList()
            error = null
            loading = false
            return@LaunchedEffect
        }
        loading = true
        error = null
        try {
            delay(300)
            results = api.search(query.trim())
        } catch (e: Exception) {
            error = e.message ?: "Search failed."
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        AppHeader(title = "Explore anime")
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            singleLine = true,
            placeholder = { Text("Search titles...") },
            leadingIcon = { Icon(Icons.Filled.Search, null) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Teal,
                unfocusedBorderColor = Color(0xFF26353E),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = Teal,
            ),
            shape = RoundedCornerShape(14.dp),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
        )
        when {
            query.trim().length < 2 -> Text("Search by anime title", Modifier.padding(20.dp), color = Muted, fontSize = 13.sp)
            loading -> CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally).padding(30.dp), color = Teal)
            error != null -> ErrorPanel(error!!) { query = query + " " }
            results.isEmpty() -> Text("No results found.", Modifier.padding(20.dp), color = Muted)
            else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(results, key = { it.id }) { item -> AnimeListRow(item, onClick = { onAnimeClick(item) }) }
            }
        }
    }
}

@Composable
private fun AnimeListRow(item: AnimeItem, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(Panel).clickable(onClick = onClick).padding(9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        AsyncImage(model = item.poster, contentDescription = item.name, modifier = Modifier.width(62.dp).height(86.dp).clip(RoundedCornerShape(9.dp)).background(Panel2), contentScale = ContentScale.Crop)
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(item.name, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
            Text(
                listOf(item.type, item.episodes.takeIf { it > 0 }?.let { "$it episodes" }, item.rating.takeIf { it.isNotBlank() }).filterNotNull().joinToString("  •  "),
                color = Muted,
                fontSize = 11.sp,
            )
        }
        Text("›", color = Teal, fontSize = 28.sp)
    }
}

@Composable
private fun AnimeDetailScreen(
    api: AnimeApi,
    anime: AnimeItem,
    isFavorite: Boolean,
    onBack: () -> Unit,
    onFavorite: () -> Unit,
    onPlay: (EpisodeItem, String) -> Unit,
) {
    var detail by remember(anime.id) { mutableStateOf<AnimeDetail?>(null) }
    var episodes by remember(anime.id) { mutableStateOf<List<EpisodeItem>>(emptyList()) }
    var loading by remember(anime.id) { mutableStateOf(true) }
    var error by remember(anime.id) { mutableStateOf<String?>(null) }
    var category by remember(anime.id) { mutableStateOf("sub") }

    LaunchedEffect(api, anime.id) {
        loading = true
        error = null
        try {
            val loaded = coroutineScope {
                val detailRequest = async { api.detail(anime.id) }
                val episodesRequest = async { api.episodes(anime.id) }
                detailRequest.await() to episodesRequest.await()
            }
            detail = loaded.first
            episodes = loaded.second
        } catch (e: Exception) {
            error = e.message ?: "Could not load this anime."
        } finally {
            loading = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onBack) { Text("‹  Back", color = Teal) }
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onFavorite) {
                Icon(if (isFavorite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, contentDescription = "Toggle favorite", tint = if (isFavorite) Teal else Color.White)
            }
        }

        if (loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Teal) }
        } else {
            val info = detail
            LazyColumn(contentPadding = PaddingValues(bottom = 30.dp), verticalArrangement = Arrangement.spacedBy(17.dp)) {
                item {
                    Box(Modifier.fillMaxWidth().height(210.dp).background(Panel2)) {
                        AsyncImage(model = info?.banner ?: anime.poster, contentDescription = anime.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, AppBg))))
                        Column(Modifier.align(Alignment.BottomStart).padding(18.dp)) {
                            Text(info?.item?.name ?: anime.name, color = Color.White, fontWeight = FontWeight.Black, fontSize = 25.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Text(
                                listOf(info?.item?.type ?: anime.type, info?.status, info?.duration).filterNotNull().filter { it.isNotBlank() }.joinToString("  •  "),
                                color = Color(0xFFD4E0E3),
                                fontSize = 11.sp,
                            )
                        }
                    }
                }
                item {
                    Column(Modifier.padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(info?.description?.takeIf { it.isNotBlank() } ?: anime.description.ifBlank { "No synopsis available." }, color = Color(0xFFC4D0D5), fontSize = 13.sp, lineHeight = 20.sp)
                        if (info?.genres?.isNotEmpty() == true) {
                            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                info.genres.forEach { genre ->
                                    Surface(color = Panel2, shape = RoundedCornerShape(7.dp), border = BorderStroke(1.dp, Color(0xFF263B43))) {
                                        Text(genre, color = Teal, fontSize = 10.sp, modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp))
                                    }
                                }
                            }
                        }
                        if (error != null) Text(error!!, color = Color(0xFFFF9A9A), fontSize = 12.sp)
                    }
                }
                item {
                    Column(Modifier.padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Episodes", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Spacer(Modifier.weight(1f))
                            Row {
                                CategoryChip("SUB", category == "sub") { category = "sub" }
                                Spacer(Modifier.width(6.dp))
                                CategoryChip("DUB", category == "dub") { category = "dub" }
                            }
                        }
                        if (episodes.isEmpty()) {
                            Text("No episode list was returned by the API.", color = Muted, fontSize = 12.sp)
                        } else {
                            episodes.forEach { episode ->
                                Row(
                                    Modifier.fillMaxWidth().clip(RoundedCornerShape(11.dp)).background(Panel).clickable { onPlay(episode, category) }.padding(horizontal = 13.dp, vertical = 13.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text("Episode ${episode.number}", color = Teal, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        Text(episode.title, color = Color.White, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    }
                                    Text("PLAY  ›", color = Teal, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(onClick = onClick, color = if (selected) Teal else Panel2, contentColor = if (selected) Color(0xFF05201D) else Muted, shape = RoundedCornerShape(8.dp)) {
        Text(label, modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun LibraryScreen(
    favorites: List<AnimeItem>,
    history: List<WatchEntry>,
    onAnimeClick: (AnimeItem) -> Unit,
    onResume: (WatchEntry) -> Unit,
) {
    Column(Modifier.fillMaxSize()) {
        AppHeader(title = "Your library")
        LazyColumn(contentPadding = PaddingValues(bottom = 22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Continue watching", Modifier.padding(horizontal = 18.dp), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    if (history.isEmpty()) {
                        Text("Your playback progress will appear here.", Modifier.padding(horizontal = 18.dp), color = Muted, fontSize = 12.sp)
                    } else {
                        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(history, key = { it.anime.id }) { entry ->
                                Column(Modifier.width(140.dp).clickable { onResume(entry) }) {
                                    AsyncImage(model = entry.anime.poster, contentDescription = entry.anime.name, modifier = Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(12.dp)).background(Panel2), contentScale = ContentScale.Crop)
                                    Text(entry.anime.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                    Text("Episode ${entry.episode.number}", color = Muted, fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Favorites", Modifier.padding(horizontal = 18.dp), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    if (favorites.isEmpty()) {
                        Text("Save anime with the heart button to build your list.", Modifier.padding(horizontal = 18.dp), color = Muted, fontSize = 12.sp)
                    }
                }
            }
            items(favorites, key = { it.id }) { item ->
                AnimeListRow(item, onClick = { onAnimeClick(item) })
            }
        }
    }
}

@Composable
private fun SettingsScreen() {
    Column(Modifier.fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AppHeader(title = "Settings")
        Text("AnimeTeal service", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Text(
            "AnimeTeal connects automatically to its managed anime catalogue and streaming service. No API setup or manual configuration is required.",
            color = Muted,
            fontSize = 13.sp,
            lineHeight = 19.sp,
        )
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Panel,
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, Color(0xFF263B43)),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Text("SERVICE STATUS", color = Teal, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
                Text("Managed automatically", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                Text("If anime or playback cannot load, use Retry. Provider availability can vary by title and region.", color = Muted, fontSize = 12.sp, lineHeight = 17.sp)
            }
        }
        Text("Your favorites and Continue Watching history stay stored locally on this device.", color = Muted, fontSize = 12.sp, lineHeight = 18.sp)
    }
}
@Composable
private fun ErrorPanel(message: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(24.dp).clip(RoundedCornerShape(16.dp)).background(Panel).padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Couldn't load AnimeTeal", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Text(message, color = Muted, fontSize = 12.sp, lineHeight = 17.sp)
        Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = Teal, contentColor = Color(0xFF05201D))) {
            Text("Retry")
        }
    }
}

@Composable
private fun ResolveOverlay(
    loading: Boolean,
    message: String?,
    onDismiss: () -> Unit,
    loadingText: String,
) {
    if (loading) {
        Box(Modifier.fillMaxSize().background(Color(0xAA000000)), contentAlignment = Alignment.Center) {
            Column(Modifier.clip(RoundedCornerShape(16.dp)).background(Panel2).padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                CircularProgressIndicator(color = Teal)
                Text(loadingText, color = Color.White, fontSize = 13.sp)
            }
        }
    } else if (message != null) {
        AlertDialog(
            onDismissRequest = onDismiss,
            title = { Text("Playback unavailable") },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = onDismiss) { Text("OK", color = Teal) } },
            containerColor = Panel2,
            titleContentColor = Color.White,
            textContentColor = Muted,
        )
    }
}
