package com.imtealplayz.animeteal

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import android.view.GestureDetector
import android.view.MotionEvent
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
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
    initialPositionMs: Long,
    hasAlternateSource: Boolean,
    isResolvingLanguage: Boolean,
    onBack: () -> Unit,
    onProgress: (Long) -> Unit,
    onTryNextSource: () -> Unit,
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
    var interactionTick by remember(stream.url, category) { mutableIntStateOf(0) }
    var seekFeedback by remember(stream.url, category) { mutableStateOf<String?>(null) }
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
                    latestTryNext()
                } else {
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

    LaunchedEffect(controlsVisible, isPlaying, interactionTick, controlsLocked) {
        if (controlsVisible && isPlaying && !controlsLocked) {
            delay(4_000)
            controlsVisible = false
        }
    }

    LaunchedEffect(seekFeedback) {
        if (seekFeedback != null) {
            delay(850)
            seekFeedback = null
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

    fun seekBy(deltaMs: Long) {
        val target = (player.currentPosition + deltaMs).coerceAtLeast(0L)
        val bounded = if (player.duration > 0L && player.duration != androidx.media3.common.C.TIME_UNSET) {
            target.coerceAtMost(player.duration)
        } else target
        player.seekTo(bounded)
        currentPosition = bounded
        seekFeedback = if (deltaMs < 0) "−10 seconds" else "+10 seconds"
        controlsVisible = true
        interactionTick++
    }

    val latestTap = rememberUpdatedState<() -> Unit> {
        if (!controlsLocked) {
            controlsVisible = !controlsVisible
            interactionTick++
        }
    }
    val latestDoubleTap = rememberUpdatedState<(Float, Float) -> Unit> { x, width ->
        if (!controlsLocked) {
            seekBy(if (x < width / 2f) -10_000L else 10_000L)
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
                    // A double tap is consumed here; the view's width is supplied
                    // from its touch listener so left/right seeking is deterministic.
                    return true
                }
            }
        )
    }

    // A separate double-tap detector supplies the actual touched view width.
    // GestureDetector's callbacks above handle single taps without exposing the
    // native player controls underneath the AnimeTeal overlay.
    val latestSeekOnVideo = rememberUpdatedState<(Float, Float) -> Unit> { x, width ->
        latestDoubleTap.value(x, width)
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
                        player = player
                        useController = false
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                        keepScreenOn = true
                        setOnTouchListener { view, event ->
                            if (event.action == MotionEvent.ACTION_UP && event.eventTime - event.downTime < 280L) {
                                // Single-tap toggling is delayed by GestureDetector
                                // so a double tap never flashes the controls.
                            }
                            if (event.action == MotionEvent.ACTION_UP) {
                                latestSeekOnVideo.value(event.x, view.width.toFloat())
                            }
                            gestureDetector.onTouchEvent(event)
                            true
                        }
                    }
                },
                update = { view ->
                    view.player = player
                    view.keepScreenOn = true
                },
            )

            if (isBuffering) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center).size(42.dp),
                    color = NativePlayerTeal,
                    strokeWidth = 3.dp,
                )
            }

            if (seekFeedback != null) {
                Surface(
                    modifier = Modifier.align(Alignment.Center),
                    color = Color(0xCC081118),
                    shape = RoundedCornerShape(30.dp),
                ) {
                    Text(
                        seekFeedback!!,
                        modifier = Modifier.padding(horizontal = 22.dp, vertical = 12.dp),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    )
                }
            }

            if (controlsLocked) {
                Surface(
                    modifier = Modifier.align(Alignment.Center),
                    color = NativePlayerPanel,
                    shape = CircleShape,
                ) {
                    TextButton(onClick = {
                        controlsLocked = false
                        controlsVisible = true
                        interactionTick++
                    }) {
                        Text("UNLOCK CONTROLS", color = NativePlayerTeal, fontWeight = FontWeight.Bold)
                    }
                }
            } else if (controlsVisible) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0xC9000000), Color.Transparent, Color.Transparent, Color(0xE8000000))
                            )
                        )
                ) {
                    Column(Modifier.fillMaxWidth().align(Alignment.TopCenter)) {
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 9.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            TextButton(onClick = latestOnBack) {
                                Text("‹ Back", color = Color.White, fontSize = 13.sp)
                            }
                            Column(Modifier.weight(1f)) {
                                Text(
                                    anime.name,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                                Text(
                                    "Episode ${episode.number} · ${episode.title}",
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
                            PlayerAction(if (isFullscreen) "Window" else "Full") {
                                isFullscreen = !isFullscreen
                            }
                            PlayerAction("Lock") {
                                controlsLocked = true
                                controlsVisible = false
                            }
                        }
                    }

                    Row(
                        Modifier.align(Alignment.Center),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(22.dp),
                    ) {
                        PlayerRoundAction("−10") { seekBy(-10_000L) }
                        Surface(
                            onClick = {
                                if (player.isPlaying) player.pause() else player.play()
                                controlsVisible = true
                                interactionTick++
                            },
                            color = Color(0xB90B171F),
                            shape = CircleShape,
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                modifier = Modifier.padding(13.dp).size(34.dp),
                                tint = Color.White,
                            )
                        }
                        PlayerRoundAction("+10") { seekBy(10_000L) }
                    }

                    Column(
                        Modifier
                            .fillMaxWidth()
                            .align(Alignment.BottomCenter)
                            .padding(horizontal = 16.dp, vertical = 11.dp),
                        verticalArrangement = Arrangement.spacedBy(5.dp),
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
                            horizontalArrangement = Arrangement.spacedBy(7.dp),
                        ) {
                            PlayerAction("${speed}x") { dialog = "speed" }
                            PlayerAction("Audio") { dialog = "audio" }
                            PlayerAction("Subtitles") { dialog = "subtitles" }
                            PlayerAction("Quality") { dialog = "quality" }
                            PlayerAction("Volume") { dialog = "volume" }
                            PlayerAction(if (repeatEnabled) "Repeat on" else "Repeat off", repeatEnabled) {
                                repeatEnabled = !repeatEnabled
                                player.repeatMode = if (repeatEnabled) {
                                    androidx.media3.common.Player.REPEAT_MODE_ONE
                                } else {
                                    androidx.media3.common.Player.REPEAT_MODE_OFF
                                }
                            }
                        }
                        if (playerError != null) {
                            Surface(
                                color = Color(0xE6201115),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    Modifier.padding(horizontal = 10.dp, vertical = 7.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        playerError!!,
                                        Modifier.weight(1f),
                                        color = Color(0xFFFFC0C0),
                                        fontSize = 11.sp,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    TextButton(onClick = { latestOnRetry(player.currentPosition) }) {
                                        Text("Retry", color = NativePlayerTeal)
                                    }
                                }
                            }
                        }
                        if (isResolvingLanguage) {
                            Text("Loading ${if (category == "sub") "SUB" else "DUB"} source…", color = NativePlayerTeal, fontSize = 11.sp)
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
