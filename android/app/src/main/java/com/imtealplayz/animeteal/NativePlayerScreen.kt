package com.imtealplayz.animeteal

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import android.view.GestureDetector
import android.view.MotionEvent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.Audiotrack
import androidx.compose.material.icons.filled.ClosedCaption
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material.icons.filled.Repeat
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

private val NativePlayerPanel = Color(0xE6101922)
private val NativePlayerTeal = Color(0xFF2DD4BF)
private val NativePlayerMuted = Color(0xFFB8C6CC)

private data class PlayerTrackOption(
    val group: Tracks.Group,
    val index: Int,
    val label: String,
    val selected: Boolean,
)

private fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

private fun formatPlayerTime(positionMs: Long): String {
    val totalSeconds = (positionMs.coerceAtLeast(0L) / 1000L).toInt()
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%d:%02d".format(minutes, seconds)
    }
}

@OptIn(UnstableApi::class)
private fun playerTrackOptions(player: ExoPlayer, type: Int): List<PlayerTrackOption> {
    return player.currentTracks.groups
        .filter { it.type == type }
        .flatMap { group ->
            (0 until group.length).mapNotNull { index ->
                if (!group.isTrackSupported(index)) return@mapNotNull null
                val format = group.getTrackFormat(index)
                val language = format.language
                    ?.takeIf { it.isNotBlank() && it != "und" }
                    ?.uppercase()
                val label = when (type) {
                    C.TRACK_TYPE_VIDEO -> {
                        val resolution = format.height.takeIf { it > 0 }?.let { "${it}p" } ?: "Video"
                        val bitrate = format.bitrate.takeIf { it > 0 }?.let { " · ${it / 1_000_000.0} Mbps" }.orEmpty()
                        resolution + bitrate
                    }
                    C.TRACK_TYPE_AUDIO -> format.label?.takeIf { it.isNotBlank() }
                        ?: language
                        ?: "Audio ${index + 1}"
                    C.TRACK_TYPE_TEXT -> format.label?.takeIf { it.isNotBlank() }
                        ?: language
                        ?: "Subtitle ${index + 1}"
                    else -> format.label ?: "Track ${index + 1}"
                }
                PlayerTrackOption(group, index, label, group.isTrackSelected(index))
            }
        }
}

@OptIn(UnstableApi::class)
private fun selectPlayerTrack(player: ExoPlayer, type: Int, option: PlayerTrackOption?) {
    val builder = player.trackSelectionParameters.buildUpon()
        .clearOverridesOfType(type)
        .setTrackTypeDisabled(type, option == null && type == C.TRACK_TYPE_TEXT)

    if (option != null) {
        builder.setTrackTypeDisabled(type, false)
        builder.addOverride(TrackSelectionOverride(option.group.mediaTrackGroup, option.index))
    }
    player.trackSelectionParameters = builder.build()
}

@OptIn(UnstableApi::class)
@Composable
fun NativePlayerScreen(
    anime: AnimeItem,
    episode: EpisodeItem,
    stream: StreamSource,
    category: String,
    subtitlePreferences: SubtitlePreferences,
    onSubtitlePreferencesChange: (SubtitlePreferences) -> Unit,
    initialPositionMs: Long,
    hasAlternateSource: Boolean,
    hasRefreshedSources: Boolean,
    onRefreshSources: (Long) -> Unit,
    isResolvingLanguage: Boolean,
    resolveError: String?,
    onDismissResolveError: () -> Unit,
    onBack: () -> Unit,
    onProgress: (Long) -> Unit,
    onTryNextSource: (Long) -> Unit,
    onChangeLanguage: (String, Long) -> Unit,
    onRetry: (Long) -> Unit,
) {
    val context = LocalContext.current
    val activity = remember(context) { context.findActivity() }
    val originalOrientation = remember(activity) {
        activity?.requestedOrientation ?: ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }

    var isFullscreen by remember { mutableStateOf(true) }
    DisposableEffect(activity, isFullscreen) {
        val window = activity?.window
        val controller = if (window != null) {
            WindowInsetsControllerCompat(window, window.decorView)
        } else null

        if (isFullscreen) {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            controller?.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller?.hide(WindowInsetsCompat.Type.systemBars())
        } else {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            controller?.show(WindowInsetsCompat.Type.systemBars())
        }

        onDispose {
            activity?.requestedOrientation = originalOrientation
            controller?.show(WindowInsetsCompat.Type.systemBars())
        }
    }

    var playerError by remember(stream.url, category) { mutableStateOf<String?>(null) }
    var currentPosition by remember(stream.url, category) {
        mutableLongStateOf(initialPositionMs.coerceAtLeast(0L))
    }
    var duration by remember(stream.url, category) { mutableLongStateOf(0L) }
    var bufferedPosition by remember(stream.url, category) { mutableLongStateOf(0L) }
    var isPlaying by remember(stream.url, category) { mutableStateOf(true) }
    var isBuffering by remember(stream.url, category) { mutableStateOf(true) }
    var controlsVisible by remember(stream.url, category) { mutableStateOf(true) }
    var controlsLocked by remember(stream.url, category) { mutableStateOf(false) }
    var unlockPromptVisible by remember(stream.url, category) { mutableStateOf(false) }
    var interactionTick by remember(stream.url, category) { mutableIntStateOf(0) }
    var seekFeedback by remember(stream.url, category) { mutableStateOf<String?>(null) }
    var seekFeedbackDirection by remember(stream.url, category) { mutableIntStateOf(1) }
    var seekFeedbackSeconds by remember(stream.url, category) { mutableIntStateOf(10) }
    var lastSeekFeedbackAt by remember(stream.url, category) { mutableLongStateOf(0L) }
    var speed by remember(stream.url, category) { mutableFloatStateOf(1f) }
    var volume by remember(stream.url, category) { mutableFloatStateOf(1f) }
    var repeatEnabled by remember(stream.url, category) { mutableStateOf(false) }
    var dialog by remember(stream.url, category) { mutableStateOf<String?>(null) }
    var trackRevision by remember(stream.url, category) { mutableIntStateOf(0) }
    val errorHandled = remember(stream.url, category) { mutableStateOf(false) }

    val player = remember(stream.url, category) {
        val dataSourceFactory = DefaultHttpDataSource.Factory()
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(35_000)
            .setDefaultRequestProperties(stream.headers)

        val trackSelector = DefaultTrackSelector(context)
        val mediaSourceFactory = DefaultMediaSourceFactory(context)
            .setDataSourceFactory(dataSourceFactory)

        ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector)
            .setMediaSourceFactory(mediaSourceFactory)
            .build()
            .apply {
                val mediaBuilder = MediaItem.Builder().setUri(stream.url)
                val streamType = stream.type.lowercase()
                if (
                    streamType.contains("hls") ||
                    streamType.contains("mpegurl") ||
                    stream.url.contains(".m3u8", ignoreCase = true)
                ) {
                    mediaBuilder.setMimeType(MimeTypes.APPLICATION_M3U8)
                } else if (
                    streamType.contains("mp4") ||
                    stream.url.contains(".mp4", ignoreCase = true)
                ) {
                    mediaBuilder.setMimeType(MimeTypes.VIDEO_MP4)
                }

                val defaultSubtitle = stream.subtitles.firstOrNull {
                    it.language.equals("en", true) ||
                        it.language.equals("eng", true) ||
                        it.language.contains("english", true) ||
                        it.label.contains("english", true)
                } ?: stream.subtitles.firstOrNull()

                val subtitleConfigurations = stream.subtitles.map { subtitle ->
                    val mimeType = when (subtitle.type.lowercase()) {
                        "srt", "subrip" -> MimeTypes.APPLICATION_SUBRIP
                        "ass", "ssa" -> MimeTypes.TEXT_SSA
                        "ttml" -> MimeTypes.APPLICATION_TTML
                        else -> MimeTypes.TEXT_VTT
                    }
                    MediaItem.SubtitleConfiguration.Builder(Uri.parse(subtitle.url))
                        .setMimeType(mimeType)
                        .setLanguage(subtitle.language)
                        .setLabel(subtitle.label)
                        .setSelectionFlags(
                            if (subtitle == defaultSubtitle) C.SELECTION_FLAG_DEFAULT else 0
                        )
                        .build()
                }
                if (subtitleConfigurations.isNotEmpty()) {
                    mediaBuilder.setSubtitleConfigurations(subtitleConfigurations)
                }

                setMediaItem(mediaBuilder.build())
                seekTo(initialPositionMs.coerceAtLeast(0L))
                prepare()
                playWhenReady = true
            }
    }

    val latestHasAlternative by rememberUpdatedState(hasAlternateSource)
    val latestHasRefreshedSources by rememberUpdatedState(hasRefreshedSources)
    val latestRefreshSources by rememberUpdatedState(onRefreshSources)
    val latestTryNext by rememberUpdatedState(onTryNextSource)
    val latestOnProgress by rememberUpdatedState(onProgress)
    val latestOnBack by rememberUpdatedState(onBack)
    val latestOnChangeLanguage by rememberUpdatedState(onChangeLanguage)
    val latestOnRetry by rememberUpdatedState(onRetry)

    DisposableEffect(player) {
        val listener = object : androidx.media3.common.Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                isBuffering = playbackState == androidx.media3.common.Player.STATE_BUFFERING
                if (playbackState == androidx.media3.common.Player.STATE_READY) {
                    isBuffering = false
                }
            }

            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
            }

            override fun onTracksChanged(tracks: Tracks) {
                trackRevision++
            }

            override fun onPlayerError(error: PlaybackException) {
                if (!errorHandled.value && latestHasAlternative) {
                    errorHandled.value = true
                    playerError = "This provider failed. Trying the next available source…"
                    latestTryNext(player.currentPosition.coerceAtLeast(0L))
                } else if (!errorHandled.value && !latestHasRefreshedSources) {
                    errorHandled.value = true
                    playerError = "No working source. Refreshing the provider list…"
                    latestRefreshSources(player.currentPosition.coerceAtLeast(0L))
                } else {
                    errorHandled.value = true
                    playerError = error.message ?: "The video stream could not be played."
                    isBuffering = false
                    controlsVisible = true
                }
            }
        }
        player.addListener(listener)
        onDispose {
            latestOnProgress(player.currentPosition.coerceAtLeast(0L))
            player.removeListener(listener)
            player.release()
        }
    }

    LaunchedEffect(player) {
        while (true) {
            currentPosition = player.currentPosition.coerceAtLeast(0L)
            duration = player.duration.takeIf { it > 0L && it != androidx.media3.common.C.TIME_UNSET } ?: 0L
            bufferedPosition = player.bufferedPosition.coerceAtLeast(0L)
            isPlaying = player.isPlaying
            isBuffering = player.playbackState == androidx.media3.common.Player.STATE_BUFFERING
            latestOnProgress(currentPosition)
            trackRevision++
            delay(5_000)
        }
    }

    LaunchedEffect(resolveError) {
        if (resolveError != null) controlsVisible = true
    }

    LaunchedEffect(controlsVisible, isPlaying, interactionTick, controlsLocked, resolveError) {
        if (controlsVisible && isPlaying && !controlsLocked && resolveError == null) {
            delay(4_000)
            controlsVisible = false
        }
    }

    LaunchedEffect(seekFeedback) {
        if (seekFeedback != null) {
            delay(800)
            seekFeedback = null
        }
    }

    LaunchedEffect(controlsLocked, unlockPromptVisible, interactionTick) {
        if (controlsLocked && unlockPromptVisible) {
            delay(3_000)
            unlockPromptVisible = false
        }
    }

    val audioTracks = remember(player, trackRevision) {
        playerTrackOptions(player, C.TRACK_TYPE_AUDIO)
    }
    val subtitleTracks = remember(player, trackRevision) {
        playerTrackOptions(player, C.TRACK_TYPE_TEXT)
    }
    val qualityTracks = remember(player, trackRevision) {
        playerTrackOptions(player, C.TRACK_TYPE_VIDEO)
    }

    val speedOptions = listOf(0.25f, 0.5f, 0.75f, 1f, 1.25f, 1.5f, 1.75f, 2f, 2.5f, 3f)

    fun seekBy(deltaMs: Long, keepControlsHidden: Boolean = false) {
        val target = (player.currentPosition + deltaMs).coerceAtLeast(0L)
        val bounded = if (player.duration > 0L && player.duration != androidx.media3.common.C.TIME_UNSET) {
            target.coerceAtMost(player.duration)
        } else target
        player.seekTo(bounded)
        currentPosition = bounded

        val direction = if (deltaMs < 0L) -1 else 1
        val now = System.currentTimeMillis()
        seekFeedbackSeconds = if (
            direction == seekFeedbackDirection && now - lastSeekFeedbackAt <= 1_100L
        ) seekFeedbackSeconds + 10 else 10
        seekFeedbackDirection = direction
        lastSeekFeedbackAt = now
        seekFeedback = (if (direction < 0) "−" else "+") + seekFeedbackSeconds + "s"

        controlsVisible = !keepControlsHidden
        interactionTick++
    }

    val latestTap = rememberUpdatedState<() -> Unit> {
        if (controlsLocked) {
            unlockPromptVisible = true
            interactionTick++
        } else {
            controlsVisible = !controlsVisible
            interactionTick++
        }
    }
    var videoWidthPx by remember { mutableIntStateOf(0) }
    val latestVideoWidth = rememberUpdatedState(videoWidthPx)
    val latestDoubleTap = rememberUpdatedState<(Float, Float) -> Unit> { x, width ->
        if (controlsLocked) {
            unlockPromptVisible = true
            interactionTick++
        } else {
            seekBy(if (x < width / 2f) -10_000L else 10_000L, keepControlsHidden = true)
        }
    }
    val gestureDetector = remember(context) {
        GestureDetector(
            context,
            object : GestureDetector.SimpleOnGestureListener() {
                override fun onSingleTapConfirmed(event: MotionEvent): Boolean {
                    latestTap.value()
                    return true
                }

                override fun onDoubleTap(event: MotionEvent): Boolean {
                    latestDoubleTap.value(event.x, latestVideoWidth.value.toFloat())
                    return true
                }
            }
        )
    }

    @SuppressLint("ClickableViewAccessibility")
    Column(
        Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { viewContext ->
                    PlayerView(viewContext).apply {
                        this.player = player
                        useController = false
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                        keepScreenOn = true
                        setOnTouchListener { view, event ->
                            if (videoWidthPx != view.width) videoWidthPx = view.width
                            gestureDetector.onTouchEvent(event)
                            true
                        }
                        applySubtitlePreferences(this, subtitlePreferences)
                    }
                },
                update = { view ->
                    view.player = player
                    view.keepScreenOn = true
                    applySubtitlePreferences(view, subtitlePreferences)
                },
            )

            if (isBuffering) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center).size(42.dp),
                    color = NativePlayerTeal,
                    strokeWidth = 3.dp,
                )
            }

            AnimatedVisibility(
                visible = seekFeedback != null && !controlsLocked,
                modifier = Modifier
                    .align(if (seekFeedbackDirection < 0) Alignment.CenterStart else Alignment.CenterEnd)
                    .padding(horizontal = 30.dp),
                enter = fadeIn(tween(120)) + scaleIn(initialScale = 0.88f, animationSpec = tween(140)),
                exit = fadeOut(tween(180)) + scaleOut(targetScale = 0.92f, animationSpec = tween(180)),
            ) {
                Surface(
                    color = Color(0xD90A151D),
                    shape = RoundedCornerShape(20.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x9952DCCB)),
                    shadowElevation = 12.dp,
                ) {
                    Row(
                        Modifier.padding(horizontal = 17.dp, vertical = 13.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(
                            if (seekFeedbackDirection < 0) Icons.Filled.Replay10 else Icons.Filled.Forward10,
                            contentDescription = null,
                            tint = NativePlayerTeal,
                            modifier = Modifier.size(31.dp),
                        )
                        Text(seekFeedback ?: "", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    }
                }
            }

            AnimatedVisibility(
                visible = controlsLocked && unlockPromptVisible,
                modifier = Modifier.align(Alignment.Center),
                enter = fadeIn(tween(150)) + scaleIn(initialScale = 0.92f, animationSpec = tween(150)),
                exit = fadeOut(tween(180)) + scaleOut(targetScale = 0.96f, animationSpec = tween(180)),
            ) {
                Surface(
                    onClick = {
                        controlsLocked = false
                        unlockPromptVisible = false
                        controlsVisible = true
                        interactionTick++
                    },
                    color = NativePlayerPanel,
                    shape = RoundedCornerShape(24.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x9952DCCB)),
                    shadowElevation = 16.dp,
                ) {
                    Row(
                        Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(9.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.LockOpen, contentDescription = null, tint = NativePlayerTeal)
                        Text("Unlock controls", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }

            AnimatedVisibility(
                visible = controlsVisible && !controlsLocked,
                modifier = Modifier.fillMaxSize(),
                enter = fadeIn(tween(180)) + slideInVertically(animationSpec = tween(180)) { it / 18 },
                exit = fadeOut(tween(150)) + slideOutVertically(animationSpec = tween(150)) { it / 18 },
            ) {
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.verticalGradient(listOf(Color(0xB8000000), Color.Transparent, Color.Transparent, Color(0xE9000000)))
                    )
                ) {
                    Column(Modifier.fillMaxWidth().align(Alignment.TopCenter)) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            PlayerIconButton(Icons.Filled.ArrowBack, "Back", latestOnBack)
                            Column(Modifier.weight(1f)) {
                                Text(anime.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(
                                    "Episode " + episode.number + " · " + episode.title,
                                    color = NativePlayerMuted,
                                    fontSize = 10.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            PlayerAction("SUB", category == "sub") {
                                if (category != "sub") latestOnChangeLanguage("sub", player.currentPosition)
                            }
                            PlayerAction("DUB", category == "dub") {
                                if (category != "dub") latestOnChangeLanguage("dub", player.currentPosition)
                            }
                            PlayerIconButton(
                                if (isFullscreen) Icons.Filled.FullscreenExit else Icons.Filled.Fullscreen,
                                if (isFullscreen) "Exit fullscreen" else "Enter fullscreen",
                            ) { isFullscreen = !isFullscreen }
                            PlayerIconButton(Icons.Filled.Lock, "Lock controls") {
                                controlsLocked = true
                                unlockPromptVisible = true
                                controlsVisible = false
                            }
                        }
                    }

                    Row(
                        Modifier.align(Alignment.Center),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(30.dp),
                    ) {
                        PlayerSeekButton(Icons.Filled.Replay10, "Rewind 10 seconds") { seekBy(-10_000L) }
                        Surface(
                            onClick = {
                                if (player.isPlaying) player.pause() else player.play()
                                controlsVisible = true
                                interactionTick++
                            },
                            modifier = Modifier.size(72.dp),
                            color = Color(0xD90B171F),
                            shape = CircleShape,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x9952DCCB)),
                            shadowElevation = 12.dp,
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                    contentDescription = if (isPlaying) "Pause" else "Play",
                                    modifier = Modifier.size(37.dp),
                                    tint = Color.White,
                                )
                            }
                        }
                        PlayerSeekButton(Icons.Filled.Forward10, "Forward 10 seconds") { seekBy(10_000L) }
                    }

                    Column(
                        Modifier.fillMaxWidth().align(Alignment.BottomCenter).padding(horizontal = 16.dp, vertical = 11.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(formatPlayerTime(currentPosition), color = Color.White, fontSize = 11.sp)
                            Spacer(Modifier.width(8.dp))
                            Slider(
                                value = if (duration > 0L) (currentPosition.toFloat() / duration.toFloat()).coerceIn(0f, 1f) else 0f,
                                onValueChange = { fraction ->
                                    if (duration > 0L) currentPosition = (duration * fraction).toLong()
                                },
                                onValueChangeFinished = { if (duration > 0L) player.seekTo(currentPosition) },
                                modifier = Modifier.weight(1f).height(26.dp),
                                colors = SliderDefaults.colors(
                                    thumbColor = NativePlayerTeal,
                                    activeTrackColor = NativePlayerTeal,
                                    inactiveTrackColor = Color(0xFF78858B),
                                ),
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(formatPlayerTime(duration), color = NativePlayerMuted, fontSize = 11.sp)
                        }
                        Row(
                            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            PlayerIconLabelAction(Icons.Filled.Speed, speed.toString() + "x") { dialog = "speed" }
                            PlayerIconLabelAction(Icons.Filled.Audiotrack, "Audio") { dialog = "audio" }
                            PlayerIconLabelAction(Icons.Filled.ClosedCaption, "Subtitles") { dialog = "subtitles" }
                            PlayerIconLabelAction(Icons.Filled.Tune, "Subtitle style") { dialog = "subtitle-style" }
                            PlayerIconLabelAction(Icons.Filled.Settings, "Quality") { dialog = "quality" }
                            PlayerIconLabelAction(Icons.Filled.VolumeUp, "Volume") { dialog = "volume" }
                            PlayerIconLabelAction(Icons.Filled.Repeat, "Repeat", selected = repeatEnabled) {
                                repeatEnabled = !repeatEnabled
                                player.repeatMode = if (repeatEnabled) {
                                    androidx.media3.common.Player.REPEAT_MODE_ONE
                                } else {
                                    androidx.media3.common.Player.REPEAT_MODE_OFF
                                }
                            }
                        }
                        if (playerError != null) {
                            Surface(color = Color(0xE6201115), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(horizontal = 10.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(playerError!!, Modifier.weight(1f), color = Color(0xFFFFC0C0), fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    TextButton(onClick = { latestOnRetry(player.currentPosition) }) { Text("Retry", color = NativePlayerTeal) }
                                }
                            }
                        }
                        if (resolveError != null) {
                            Surface(color = Color(0xE62B1B16), shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(horizontal = 10.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(resolveError, Modifier.weight(1f), color = Color(0xFFFFD4BA), fontSize = 11.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                    TextButton(onClick = onDismissResolveError) { Text("Dismiss", color = NativePlayerTeal) }
                                }
                            }
                        }
                        if (isResolvingLanguage) {
                            Text("Loading " + (if (category == "sub") "SUB" else "DUB") + " source…", color = NativePlayerTeal, fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }

    if (dialog != null) {
        when (dialog) {
            "speed" -> PlayerOptionsDialog(
                title = "Playback speed",
                selected = "${speed}x",
                options = speedOptions.map { "${it}x" },
                onSelect = { chosen ->
                    val next = speedOptions.firstOrNull { "${it}x" == chosen } ?: 1f
                    speed = next
                    player.setPlaybackParameters(PlaybackParameters(next))
                    dialog = null
                    controlsVisible = true
                    interactionTick++
                },
                onDismiss = { dialog = null },
            )
            "audio" -> PlayerOptionsDialog(
                title = "Audio track",
                selected = audioTracks.firstOrNull { it.selected }?.label ?: "Auto",
                options = listOf("Auto") + audioTracks.map { it.label },
                onSelect = { chosen ->
                    if (chosen == "Auto") {
                        selectPlayerTrack(player, C.TRACK_TYPE_AUDIO, null)
                    } else {
                        audioTracks.firstOrNull { it.label == chosen }?.let {
                            selectPlayerTrack(player, C.TRACK_TYPE_AUDIO, it)
                        }
                    }
                    dialog = null
                    controlsVisible = true
                    interactionTick++
                },
                onDismiss = { dialog = null },
            )
            "subtitles" -> PlayerOptionsDialog(
                title = "Subtitles",
                selected = subtitleTracks.firstOrNull { it.selected }?.label ?: "Off",
                options = listOf("Off") + subtitleTracks.map { it.label },
                onSelect = { chosen ->
                    if (chosen == "Off") {
                        selectPlayerTrack(player, C.TRACK_TYPE_TEXT, null)
                    } else {
                        subtitleTracks.firstOrNull { it.label == chosen }?.let {
                            selectPlayerTrack(player, C.TRACK_TYPE_TEXT, it)
                        }
                    }
                    dialog = null
                    controlsVisible = true
                    interactionTick++
                },
                onDismiss = { dialog = null },
            )
            "subtitle-style" -> SubtitleSettingsDialog(
                preferences = subtitlePreferences,
                onChange = onSubtitlePreferencesChange,
                onDismiss = { dialog = null },
            )
            "quality" -> PlayerOptionsDialog(
                title = "Video quality",
                selected = qualityTracks.firstOrNull { it.selected }?.label ?: "Auto",
                options = listOf("Auto") + qualityTracks.map { it.label },
                onSelect = { chosen ->
                    if (chosen == "Auto") {
                        selectPlayerTrack(player, C.TRACK_TYPE_VIDEO, null)
                    } else {
                        qualityTracks.firstOrNull { it.label == chosen }?.let {
                            selectPlayerTrack(player, C.TRACK_TYPE_VIDEO, it)
                        }
                    }
                    dialog = null
                    controlsVisible = true
                    interactionTick++
                },
                onDismiss = { dialog = null },
            )
            "volume" -> AlertDialog(
                onDismissRequest = { dialog = null },
                containerColor = NativePlayerPanel,
                title = { Text("Player volume", color = Color.White) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("${(volume * 100).roundToInt()}%", color = NativePlayerMuted)
                        Slider(
                            value = volume,
                            onValueChange = {
                                volume = it
                                player.volume = it
                            },
                            valueRange = 0f..1f,
                            colors = SliderDefaults.colors(
                                thumbColor = NativePlayerTeal,
                                activeTrackColor = NativePlayerTeal,
                            ),
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = { dialog = null }) {
                        Text("Done", color = NativePlayerTeal)
                    }
                },
            )
            else -> dialog = null
        }
    }
}

@Composable
private fun PlayerAction(
    label: String,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = if (selected) NativePlayerTeal else Color(0xB90D1821),
        contentColor = if (selected) Color(0xFF04201C) else Color.White,
        shape = RoundedCornerShape(18.dp),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (selected) NativePlayerTeal else Color(0x664C626D),
        ),
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
        )
    }
}

@Composable
private fun PlayerRoundAction(label: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        color = Color(0xB90B171F),
        contentColor = Color.White,
        shape = CircleShape,
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 11.dp, vertical = 15.dp),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun PlayerIconButton(icon: ImageVector, contentDescription: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.size(39.dp),
        color = Color(0xB90D1821),
        shape = CircleShape,
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x664C626D)),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = contentDescription, tint = Color.White, modifier = Modifier.size(19.dp))
        }
    }
}

@Composable
private fun PlayerSeekButton(icon: ImageVector, contentDescription: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.size(62.dp),
        color = Color(0xB90B171F),
        shape = CircleShape,
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x664C626D)),
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(icon, contentDescription = contentDescription, tint = Color.White, modifier = Modifier.size(28.dp))
            Text("10s", color = NativePlayerMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun PlayerIconLabelAction(
    icon: ImageVector,
    label: String,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = if (selected) Color(0xFF173B39) else Color(0xB90D1821),
        shape = RoundedCornerShape(13.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) NativePlayerTeal else Color(0x664C626D)),
    ) {
        Column(
            modifier = Modifier.widthIn(min = 64.dp).height(56.dp).padding(horizontal = 9.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(icon, contentDescription = label, tint = if (selected) NativePlayerTeal else Color.White, modifier = Modifier.size(19.dp))
            Text(label, color = if (selected) NativePlayerTeal else NativePlayerMuted, fontSize = 8.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
        }
    }
}

@Composable
private fun PlayerOptionsDialog(
    title: String,
    selected: String,
    options: List<String>,
    onSelect: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NativePlayerPanel,
        title = { Text(title, color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                Modifier.heightIn(max = 360.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(3.dp),
            ) {
                options.distinct().forEach { option ->
                    Surface(
                        onClick = { onSelect(option) },
                        color = if (option == selected) Color(0xFF143B3A) else Color.Transparent,
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                option,
                                Modifier.weight(1f),
                                color = if (option == selected) NativePlayerTeal else Color.White,
                                fontWeight = if (option == selected) FontWeight.Bold else FontWeight.Normal,
                                fontSize = 13.sp,
                            )
                            if (option == selected) Text("✓", color = NativePlayerTeal)
                        }
                    }
                }
                if (options.isEmpty()) {
                    Text("No tracks are available in this stream.", color = NativePlayerMuted, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = NativePlayerTeal)
            }
        },
    )
}
