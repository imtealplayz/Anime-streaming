package com.imtealplayz.animeteal

import android.os.Bundle
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.compose.runtime.mutableStateOf
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.ui.graphics.Color

class MainActivity : ComponentActivity() {
    private val pendingAuthTicketState = mutableStateOf<String?>(null)
    val authTicket: String? get() = pendingAuthTicketState.value

    fun clearAuthTicket() {
        pendingAuthTicketState.value = null
    }

    private fun captureAuthTicket(intent: Intent?) {
        val data = intent?.data ?: return
        if (data.scheme == "animeteal" && data.host == "auth") {
            pendingAuthTicketState.value = data.getQueryParameter("ticket")
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        captureAuthTicket(intent)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        captureAuthTicket(intent)

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
