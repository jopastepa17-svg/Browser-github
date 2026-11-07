package app.nex.browser

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.core.view.WindowCompat
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoRuntimeSettings

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)

        // Runtime живёт на уровне процесса и переживает поворот экрана.
        val runtime = NexRuntime.get(applicationContext)

        runtime.settings.apply {
            aboutConfigEnabled = false
            javaScriptEnabled = true
            webManifestEnabled = true
            // Приватность по умолчанию: строгая изоляция куки по сайтам.
            cookieBehavior = GeckoRuntimeSettings.COOKIE_BEHAVIOR_TOTAL_PROTECTION
            cookieLifetime = GeckoRuntimeSettings.COOKIE_LIFETIME_DAYS
            loginAutofillEnabled = false
            javascriptEnabled = true
        }

        setContent {
            NexTheme(darkTheme = isSystemInDarkTheme()) {
                NexApp(runtime = runtime)
            }
        }
    }
}

/** Процесс-синглтон движка: второй GeckoRuntime в том же процессе создать нельзя. */
object NexRuntime {
    @Volatile private var instance: GeckoRuntime? = null

    fun get(context: android.content.Context): GeckoRuntime =
        instance ?: synchronized(this) {
            instance ?: GeckoRuntime.create(context).also { instance = it }
        }
}
