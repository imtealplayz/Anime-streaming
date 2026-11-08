@file:OptIn(androidx.media3.common.util.UnstableApi::class)

package com.imtealplayz.animeteal

import android.content.Context
import android.graphics.Typeface
import android.util.TypedValue
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.media3.ui.CaptionStyleCompat
import androidx.media3.ui.PlayerView
import kotlin.math.roundToInt

private val SubtitleTeal = Color(0xFF2DD4BF)
private val SubtitlePanel = Color(0xFF111C25)
private val SubtitleMuted = Color(0xFF9AAAB4)

data class SubtitlePreferences(
    val textSizeSp: Float = 25f,
    val fontFamily: String = "sans-serif",
    val bold: Boolean = false,
    val italic: Boolean = false,
    val textColor: Int = android.graphics.Color.WHITE,
    val textOpacity: Float = 1f,
    val backgroundColor: Int = android.graphics.Color.BLACK,
    val backgroundOpacity: Float = 0.68f,
    val windowColor: Int = android.graphics.Color.BLACK,
    val windowOpacity: Float = 0f,
    val edgeType: Int = CaptionStyleCompat.EDGE_TYPE_OUTLINE,
    val edgeColor: Int = android.graphics.Color.BLACK,
    val bottomPaddingFraction: Float = 0.08f,
)

class SubtitlePreferencesStore(context: Context) {
    private val prefs = context.getSharedPreferences("animeteal_subtitles", Context.MODE_PRIVATE)

    fun load(): SubtitlePreferences = SubtitlePreferences(
        textSizeSp = prefs.getFloat("text_size", 25f).coerceIn(14f, 42f),
        fontFamily = prefs.getString("font_family", "sans-serif") ?: "sans-serif",
        bold = prefs.getBoolean("bold", false),
        italic = prefs.getBoolean("italic", false),
        textColor = prefs.getInt("text_color", android.graphics.Color.WHITE),
        textOpacity = prefs.getFloat("text_opacity", 1f).coerceIn(0f, 1f),
        backgroundColor = prefs.getInt("background_color", android.graphics.Color.BLACK),
        backgroundOpacity = prefs.getFloat("background_opacity", 0.68f).coerceIn(0f, 1f),
        windowColor = prefs.getInt("window_color", android.graphics.Color.BLACK),
        windowOpacity = prefs.getFloat("window_opacity", 0f).coerceIn(0f, 1f),
        edgeType = prefs.getInt("edge_type", CaptionStyleCompat.EDGE_TYPE_OUTLINE)
            .coerceIn(CaptionStyleCompat.EDGE_TYPE_NONE, CaptionStyleCompat.EDGE_TYPE_DEPRESSED),
        edgeColor = prefs.getInt("edge_color", android.graphics.Color.BLACK),
        bottomPaddingFraction = prefs.getFloat("bottom_padding", 0.08f).coerceIn(0f, 0.25f),
    )

    fun save(value: SubtitlePreferences) {
        prefs.edit()
            .putFloat("text_size", value.textSizeSp)
            .putString("font_family", value.fontFamily)
            .putBoolean("bold", value.bold)
            .putBoolean("italic", value.italic)
            .putInt("text_color", value.textColor)
            .putFloat("text_opacity", value.textOpacity)
            .putInt("background_color", value.backgroundColor)
            .putFloat("background_opacity", value.backgroundOpacity)
            .putInt("window_color", value.windowColor)
            .putFloat("window_opacity", value.windowOpacity)
            .putInt("edge_type", value.edgeType)
            .putInt("edge_color", value.edgeColor)
            .putFloat("bottom_padding", value.bottomPaddingFraction)
            .apply()
    }
}

/** Apply the saved user style directly to Media3's native subtitle renderer. */
fun applySubtitlePreferences(playerView: PlayerView, preferences: SubtitlePreferences) {
    val styleBits = (if (preferences.bold) Typeface.BOLD else Typeface.NORMAL) or
        (if (preferences.italic) Typeface.ITALIC else Typeface.NORMAL)
    val typeface = Typeface.create(preferences.fontFamily, styleBits)

    playerView.subtitleView?.apply {
        // Provider-specific ASS/VTT styling should not silently override the user's choices.
        setApplyEmbeddedStyles(false)
        setApplyEmbeddedFontSizes(false)
        setStyle(
            CaptionStyleCompat(
                withOpacity(preferences.textColor, preferences.textOpacity),
                withOpacity(preferences.backgroundColor, preferences.backgroundOpacity),
                withOpacity(preferences.windowColor, preferences.windowOpacity),
                preferences.edgeType,
                preferences.edgeColor,
                typeface,
            )
        )
        setFixedTextSize(TypedValue.COMPLEX_UNIT_SP, preferences.textSizeSp.coerceIn(14f, 42f))
        setBottomPaddingFraction(preferences.bottomPaddingFraction.coerceIn(0f, 0.25f))
    }
}

private fun withOpacity(color: Int, opacity: Float): Int {
    val alpha = (opacity.coerceIn(0f, 1f) * 255f).roundToInt()
    return android.graphics.Color.argb(
        alpha,
        android.graphics.Color.red(color),
        android.graphics.Color.green(color),
        android.graphics.Color.blue(color),
    )
}

private val subtitlePalette = listOf(
    android.graphics.Color.WHITE,
    android.graphics.Color.YELLOW,
    android.graphics.Color.CYAN,
    0xFFFFA6D9.toInt(),
    0xFFFFB36B.toInt(),
    0xFFB8F28B.toInt(),
    0xFF9DBBFF.toInt(),
    0xFFE5C7FF.toInt(),
    android.graphics.Color.BLACK,
    0xFF30343B.toInt(),
    0xFF777777.toInt(),
    0xFFFF4D4D.toInt(),
)

private data class SubtitleFontOption(val label: String, val family: String)

private val subtitleFonts = listOf(
    SubtitleFontOption("Sans", "sans-serif"),
    SubtitleFontOption("Serif", "serif"),
    SubtitleFontOption("Mono", "monospace"),
    SubtitleFontOption("Rounded", "sans-serif-rounded"),
    SubtitleFontOption("Condensed", "sans-serif-condensed"),
    SubtitleFontOption("Cursive", "cursive"),
    SubtitleFontOption("Casual", "casual"),
)

@Composable
fun SubtitleSettingsScreen(
    preferences: SubtitlePreferences,
    onChange: (SubtitlePreferences) -> Unit,
) {
    Column(
        Modifier.fillMaxSize().background(Color(0xFF07090E)),
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 15.dp)) {
            Text("Settings", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("Make subtitles look the way you want.", color = SubtitleMuted, fontSize = 12.sp)
        }
        SubtitleSettingsContent(
            preferences = preferences,
            onChange = onChange,
            modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()),
        )
    }
}

@Composable
fun SubtitleSettingsDialog(
    preferences: SubtitlePreferences,
    onChange: (SubtitlePreferences) -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color(0xFF0D141B),
            shape = RoundedCornerShape(22.dp),
            border = BorderStroke(1.dp, Color(0xFF263B43)),
        ) {
            Column(Modifier.heightIn(max = 560.dp)) {
                Row(
                    Modifier.fillMaxWidth().padding(start = 18.dp, end = 8.dp, top = 13.dp, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("Subtitle appearance", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Text("Changes apply to the player immediately.", color = SubtitleMuted, fontSize = 11.sp)
                    }
                    TextButton(onClick = onDismiss) { Text("Done", color = SubtitleTeal) }
                }
                Divider(color = Color(0xFF263B43))
                SubtitleSettingsContent(
                    preferences = preferences,
                    onChange = onChange,
                    modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()),
                )
            }
        }
    }
}

@Composable
private fun SubtitleSettingsContent(
    preferences: SubtitlePreferences,
    onChange: (SubtitlePreferences) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text("LIVE PREVIEW", color = SubtitleTeal, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.6.sp)
            Box(
                Modifier.fillMaxWidth().height(190.dp).clip(RoundedCornerShape(16.dp)).background(Color.Black),
            ) {
                SubtitleGifBackground(Modifier.fillMaxSize())
                Box(
                    Modifier.fillMaxSize().background(
                        Brush.verticalGradient(
                            listOf(Color(0x22000000), Color(0x1A000000), Color(0xCC000000))
                        )
                    )
                )
                Text(
                    "PREVIEW",
                    Modifier.align(Alignment.TopStart).padding(11.dp),
                    color = Color.White.copy(alpha = 0.78f),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.5.sp,
                )
                Box(
                    Modifier.fillMaxSize()
                        .padding(horizontal = 8.dp)
                        .padding(bottom = 14.dp + 190.dp * preferences.bottomPaddingFraction),
                    contentAlignment = Alignment.BottomCenter,
                ) {
                    SubtitlePreviewText(preferences)
                }
            }
            Text(
                "This is a sample. Actual subtitle timing and line breaks depend on the selected episode.",
                color = SubtitleMuted,
                fontSize = 10.sp,
                lineHeight = 14.sp,
            )
        }

        SettingsGroup("Text") {
            SubtitleSlider(
                title = "Font size",
                valueLabel = "${preferences.textSizeSp.roundToInt()} sp",
                value = preferences.textSizeSp,
                range = 14f..42f,
                steps = 13,
                onValueChange = { onChange(preferences.copy(textSizeSp = it)) },
            )
            Text("Font family", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                subtitleFonts.forEach { font ->
                    ChoiceChip(
                        label = font.label,
                        selected = preferences.fontFamily == font.family,
                        onClick = { onChange(preferences.copy(fontFamily = font.family)) },
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = preferences.bold,
                    onCheckedChange = { onChange(preferences.copy(bold = it)) },
                    colors = androidx.compose.material3.CheckboxDefaults.colors(checkedColor = SubtitleTeal),
                )
                Text("Bold", color = Color.White, fontSize = 12.sp)
                Spacer(Modifier.size(12.dp))
                Checkbox(
                    checked = preferences.italic,
                    onCheckedChange = { onChange(preferences.copy(italic = it)) },
                    colors = androidx.compose.material3.CheckboxDefaults.colors(checkedColor = SubtitleTeal),
                )
                Text("Italic", color = Color.White, fontSize = 12.sp)
            }
        }

        SettingsGroup("Text colour") {
            SubtitleColorPicker(
                selected = preferences.textColor,
                onSelect = { onChange(preferences.copy(textColor = it)) },
            )
            SubtitleSlider(
                title = "Text opacity",
                valueLabel = "${(preferences.textOpacity * 100).roundToInt()}%",
                value = preferences.textOpacity,
                range = 0f..1f,
                onValueChange = { onChange(preferences.copy(textOpacity = it)) },
            )
        }

        SettingsGroup("Text background") {
            SubtitleColorPicker(
                selected = preferences.backgroundColor,
                onSelect = { onChange(preferences.copy(backgroundColor = it)) },
            )
            SubtitleSlider(
                title = "Background opacity",
                valueLabel = "${(preferences.backgroundOpacity * 100).roundToInt()}%",
                value = preferences.backgroundOpacity,
                range = 0f..1f,
                onValueChange = { onChange(preferences.copy(backgroundOpacity = it)) },
            )
        }

        SettingsGroup("Subtitle window") {
            Text("Controls the larger caption area behind the text box.", color = SubtitleMuted, fontSize = 10.sp)
            SubtitleColorPicker(
                selected = preferences.windowColor,
                onSelect = { onChange(preferences.copy(windowColor = it)) },
            )
            SubtitleSlider(
                title = "Window opacity",
                valueLabel = "${(preferences.windowOpacity * 100).roundToInt()}%",
                value = preferences.windowOpacity,
                range = 0f..1f,
                onValueChange = { onChange(preferences.copy(windowOpacity = it)) },
            )
        }

        SettingsGroup("Text outline") {
            Row(
                Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                listOf(
                    CaptionStyleCompat.EDGE_TYPE_NONE to "None",
                    CaptionStyleCompat.EDGE_TYPE_OUTLINE to "Outline",
                    CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW to "Shadow",
                    CaptionStyleCompat.EDGE_TYPE_RAISED to "Raised",
                    CaptionStyleCompat.EDGE_TYPE_DEPRESSED to "Depressed",
                ).forEach { (type, label) ->
                    ChoiceChip(
                        label = label,
                        selected = preferences.edgeType == type,
                        onClick = { onChange(preferences.copy(edgeType = type)) },
                    )
                }
            }
            Text("Outline colour", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            SubtitleColorPicker(
                selected = preferences.edgeColor,
                onSelect = { onChange(preferences.copy(edgeColor = it)) },
            )
        }

        SettingsGroup("Position") {
            SubtitleSlider(
                title = "Bottom spacing",
                valueLabel = "${(preferences.bottomPaddingFraction * 100).roundToInt()}%",
                value = preferences.bottomPaddingFraction,
                range = 0f..0.25f,
                onValueChange = { onChange(preferences.copy(bottomPaddingFraction = it)) },
            )
            Text(
                "Increase this value to move subtitles farther above the bottom edge.",
                color = SubtitleMuted,
                fontSize = 10.sp,
            )
        }

        Button(
            onClick = { onChange(SubtitlePreferences()) },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF173A3A),
                contentColor = SubtitleTeal,
            ),
            shape = RoundedCornerShape(12.dp),
        ) {
            Text("Reset subtitle settings")
        }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun SubtitlePreviewText(preferences: SubtitlePreferences) {
    val previewColor = Color(preferences.textColor).copy(alpha = preferences.textOpacity)
    val background = Color(preferences.backgroundColor).copy(alpha = preferences.backgroundOpacity)
    val window = Color(preferences.windowColor).copy(alpha = preferences.windowOpacity)
    val shadow = Shadow(
        color = Color(preferences.edgeColor),
        offset = Offset(1.5f, 1.5f),
        blurRadius = if (preferences.edgeType == CaptionStyleCompat.EDGE_TYPE_OUTLINE) 2f else 4f,
    )

    Box(
        modifier = Modifier.fillMaxWidth().background(window),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 3.dp),
            color = background,
            shape = RoundedCornerShape(3.dp),
        ) {
            Text(
                "Subtitles will look like this",
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                color = previewColor,
                fontSize = preferences.textSizeSp.coerceIn(14f, 42f).sp,
                fontWeight = if (preferences.bold) FontWeight.Bold else FontWeight.Normal,
                fontStyle = if (preferences.italic) FontStyle.Italic else FontStyle.Normal,
                fontFamily = composeFontFamily(preferences.fontFamily),
                textAlign = TextAlign.Center,
                lineHeight = (preferences.textSizeSp * 1.2f).sp,
                style = androidx.compose.ui.text.TextStyle(
                    shadow = if (preferences.edgeType == CaptionStyleCompat.EDGE_TYPE_NONE) null else shadow,
                ),
            )
        }
    }
}

private fun composeFontFamily(value: String): FontFamily = when (value) {
    "serif" -> FontFamily.Serif
    "monospace" -> FontFamily.Monospace
    "cursive", "casual" -> FontFamily.Cursive
    else -> FontFamily.SansSerif
}

@Composable
private fun SettingsGroup(
    title: String,
    content: @Composable () -> Unit,
) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(SubtitlePanel).padding(13.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp),
    ) {
        Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        content()
    }
}

@Composable
private fun SubtitleSlider(
    title: String,
    valueLabel: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    steps: Int = 0,
    onValueChange: (Float) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(title, Modifier.weight(1f), color = Color(0xFFE7EFF2), fontSize = 12.sp)
            Text(valueLabel, color = SubtitleTeal, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = range,
            steps = steps,
            colors = SliderDefaults.colors(
                thumbColor = SubtitleTeal,
                activeTrackColor = SubtitleTeal,
                inactiveTrackColor = Color(0xFF35444D),
            ),
        )
    }
}

@Composable
private fun SubtitleColorPicker(
    selected: Int,
    onSelect: (Int) -> Unit,
) {
    val hexState = androidx.compose.runtime.remember(selected) {
        androidx.compose.runtime.mutableStateOf("#%06X".format(selected and 0xFFFFFF))
    }
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            subtitlePalette.forEach { colorValue ->
                val chosen = selected == colorValue
                Surface(
                    onClick = { onSelect(colorValue) },
                    modifier = Modifier.size(if (chosen) 34.dp else 30.dp),
                    shape = CircleShape,
                    color = Color(colorValue),
                    border = BorderStroke(
                        if (chosen) 2.dp else 1.dp,
                        if (chosen) SubtitleTeal else Color(0xFF53636C),
                    ),
                ) {
                    if (chosen) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(
                                "✓",
                                color = if (colorValue == android.graphics.Color.WHITE || colorValue == android.graphics.Color.YELLOW) Color.Black else Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                            )
                        }
                    }
                }
            }
        }
        OutlinedTextField(
            value = hexState.value,
            onValueChange = { nextValue: String ->
                hexState.value = nextValue.take(7)
                val digits = nextValue.removePrefix("#")
                if (digits.matches(Regex("^[0-9a-fA-F]{6}$"))) {
                    onSelect(android.graphics.Color.parseColor("#$digits"))
                }
            },
            modifier = Modifier.width(132.dp),
            singleLine = true,
            label = { Text("Custom hex") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = SubtitleTeal,
                unfocusedBorderColor = Color(0xFF35444D),
                focusedTextColor = Color.White,
                unfocusedTextColor = Color.White,
                cursorColor = SubtitleTeal,
                focusedLabelColor = SubtitleTeal,
                unfocusedLabelColor = SubtitleMuted,
            ),
        )
    }
}

@Composable
private fun ChoiceChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        color = if (selected) Color(0xFF16403E) else Color(0xFF18242D),
        contentColor = if (selected) SubtitleTeal else Color(0xFFD6E0E4),
        border = BorderStroke(1.dp, if (selected) SubtitleTeal.copy(alpha = 0.7f) else Color(0xFF30424B)),
        shape = RoundedCornerShape(9.dp),
    ) {
        Text(
            label,
            Modifier.padding(horizontal = 11.dp, vertical = 8.dp),
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        )
    }
}
