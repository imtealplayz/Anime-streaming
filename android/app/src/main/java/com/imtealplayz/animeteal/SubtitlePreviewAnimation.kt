@file:Suppress("DEPRECATION")

package com.imtealplayz.animeteal

import android.content.Context
import android.graphics.Canvas
import android.graphics.Movie
import android.os.SystemClock
import android.util.Base64
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

private const val SUBTITLE_PREVIEW_GIF = "${b64}"

private val subtitlePreviewGifBytes: ByteArray by lazy(LazyThreadSafetyMode.NONE) {
    Base64.decode(SUBTITLE_PREVIEW_GIF, Base64.DEFAULT)
}

@Composable
fun SubtitleGifBackground(modifier: Modifier = Modifier) {
    AndroidView(
        modifier = modifier,
        factory = { context -> SubtitleGifView(context) },
    )
}

private class SubtitleGifView(context: Context) : View(context) {
    private val movie = Movie.decodeByteArray(
        subtitlePreviewGifBytes,
        0,
        subtitlePreviewGifBytes.size,
    )
    private var startedAtMs = 0L

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val animation = movie ?: return
        if (width <= 0 || height <= 0 || animation.width() <= 0 || animation.height() <= 0) return

        val now = SystemClock.uptimeMillis()
        if (startedAtMs == 0L) startedAtMs = now
        val duration = animation.duration().coerceAtLeast(1)
        animation.setTime(((now - startedAtMs) % duration).toInt())

        val scale = maxOf(
            width.toFloat() / animation.width().toFloat(),
            height.toFloat() / animation.height().toFloat(),
        )
        val scaledWidth = animation.width() * scale
        val scaledHeight = animation.height() * scale

        canvas.save()
        canvas.translate((width - scaledWidth) / 2f, (height - scaledHeight) / 2f)
        canvas.scale(scale, scale)
        animation.draw(canvas, 0f, 0f)
        canvas.restore()

        postInvalidateDelayed(40L)
    }
}
