package com.imtealplayz.animeteal

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = android.graphics.Color.rgb(7, 9, 14)
        window.navigationBarColor = android.graphics.Color.rgb(7, 9, 14)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }

        setContent {
            MaterialTheme(
                colorScheme = darkColorScheme(
                    primary = Color(0xFF2DD4BF),
                    onPrimary = Color(0xFF031311),
                    secondary = Color(0xFF67E8F9),
                    background = Color(0xFF07090E),
                    surface = Color(0xFF0D141B),
                    onBackground = Color(0xFFF3F7F8),
                    onSurface = Color(0xFFF3F7F8),
                )
            ) {
                AnimeTealApp()
            }
        }
    }
}
