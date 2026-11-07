package app.nex.browser

import android.net.Uri
import org.json.JSONObject
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSessionSettings

/**
 * Обёртка над GeckoView:
 *  - сессии создаются с приватными настройками по умолчанию;
 *  - «инкогнито» переключается на уровне сессии (usePrivateMode);
 *  - счётчики блокировок приходят из движка, а не имитируются.
 */
class NexEngine(private val runtime: GeckoRuntime) {
    fun newSession(privateMode: Boolean): GeckoSession {
        val settings = GeckoSessionSettings.Builder()
            .usePrivateMode(privateMode)
            .contextId(GeckoSessionSettings.CONTEXT_NONE)
            .build()
        return GeckoSession(settings).also { it.open(runtime) }
    }

    /** Адрес — в URL, обычный текст — в поиск выбранного движка. */
    fun toUrlOrSearch(input: String, engine: SearchEngine = SearchEngine.DUCKDUCKGO): String {
        val text = input.trim()
        if (text.isEmpty()) return "nex://start"
        val looksLikeUrl = (text.contains(".") && !text.contains(" ")) ||
            text.startsWith("http://") || text.startsWith("https://")
        return if (looksLikeUrl) {
            if (text.startsWith("http")) text else "https://$text"
        } else {
            engine.queryUrl(text)
        }
    }

    /** Убирает utm-метки: та же «чистка ссылок», что в прототипе 0.3. */
    fun cleanTracking(url: String): String {
        val tracked = setOf(
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "fbclid", "gclid", "yclid", "mc_eid", "igshid"
        )
        return runCatching {
            val uri = Uri.parse(url)
            val names = uri.queryParameterNames ?: return url
            val keep = names.filter { it !in tracked }
            if (keep.size == names.size) return url
            val clean = uri.buildUpon().clearQuery()
            keep.forEach { clean.appendQueryParameter(it, uri.getQueryParameter(it)) }
            clean.build().toString()
        }.getOrDefault(url)
    }

    companion object {
        /** Настройки, которые имеет смысл выставить через runtime.settings. */
        fun hardenedPrefs(): JSONObject = JSONObject().apply {
            put("privacy.resistFingerprinting", true)
            put("privacy.trackingprotection.enabled", true)
            put("privacy.trackingprotection.socialtracking.enabled", true)
            put("privacy.trackingprotection.cryptomining.enabled", true)
            put("privacy.trackingprotection.fingerprinting.enabled", true)
            put("network.cookie.cookieBehavior", 5) // total protection
            put("toolkit.telemetry.enabled", false)
            put("datareporting.policy.dataSubmissionEnabled", false)
        }
    }
}

enum class SearchEngine(val label: String, private val base: String) {
    DUCKDUCKGO("DuckDuckGo", "https://duckduckgo.com/?q="),
    STARTPAGE("Startpage", "https://www.startpage.com/sp/search?query="),
    BRAVE("Brave", "https://search.brave.com/search?q=");

    fun queryUrl(q: String): String = base + Uri.encode(q)
}
