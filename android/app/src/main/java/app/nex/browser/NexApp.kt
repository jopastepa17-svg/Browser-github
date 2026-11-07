package app.nex.browser

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.draw.clip
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoView
import java.util.UUID

/* ============================ state ============================ */

enum class Screen { START, BROWSER, TABS, SHIELD, HISTORY, SETTINGS }

data class Tab(
    val id: String = UUID.randomUUID().toString(),
    val url: String = "about:blank",
    val title: String = "Новая вкладка",
    val host: String = "",
    val private: Boolean = false,
    val blocked: Int = 0,
    val progress: Int = 0,
    val group: String? = null,
    val current: Boolean = false
)

data class HistoryEntry(val id: String, val title: String, val host: String, val time: String, val day: String)

data class UiState(
    val screen: Screen = Screen.START,
    val tabs: List<Tab> = listOf(Tab(current = true)),
    val blocked: Int = 0,
    val stealth: Boolean = false,
    val reader: Boolean = false,
    val theme: NexThemeMode = NexThemeMode.LIGHT,
    val engine: SearchEngine = SearchEngine.DUCKDUCKGO,
    val findOpen: Boolean = false,
    val findQuery: String = "",
    val fontScale: Float = 1f,
    val history: List<HistoryEntry> = emptyList(),
    val settings: Map<String, Boolean> = mapOf(
        "ads" to true, "track" to true, "cookie" to true,
        "fp" to true, "strip" to true, "telemetry" to true,
        "doh" to true, "hwaccel" to true
    )
) {
    val currentTab: Tab get() = tabs.firstOrNull { it.current } ?: tabs.first()
}

class NexViewModel(val runtime: GeckoRuntime) : ViewModel() {
    private val engine = NexEngine(runtime)
    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun go(screen: Screen) = _state.update { it.copy(screen = screen) }

    fun newTab(privateMode: Boolean = false) = _state.update { s ->
        s.copy(
            tabs = s.tabs.map { it.copy(current = false) } + Tab(current = true, private = privateMode, group = null),
            screen = Screen.BROWSER
        )
    }

    fun closeTab(id: String) = _state.update { s ->
        val wasCurrent = s.tabs.any { it.id == id && it.current }
        val left = s.tabs.filterNot { it.id == id }
        val tabs = if (left.isEmpty()) listOf(Tab(current = true)) else left
        s.copy(tabs = if (wasCurrent) tabs.mapIndexed { i, t -> t.copy(current = i == 0) } else tabs)
    }

    fun selectTab(id: String) = _state.update { s ->
        s.copy(tabs = s.tabs.map { it.copy(current = it.id == id) }, screen = Screen.BROWSER)
    }

    fun toggleStealth() = _state.update { it.copy(stealth = !it.stealth) }
    fun toggleReader() = _state.update { it.copy(reader = !it.reader) }
    fun setTheme(mode: NexThemeMode) = _state.update { it.copy(theme = mode) }
    fun setEngine(e: SearchEngine) = _state.update { it.copy(engine = e) }
    fun toggleSetting(key: String) = _state.update { s ->
        s.copy(settings = s.settings + (key to !(s.settings[key] ?: false)))
    }
    fun setFind(open: Boolean, query: String = "") = _state.update { it.copy(findOpen = open, findQuery = query) }

    fun onBlocked(count: Int) = _state.update { it.copy(blocked = it.blocked + count) }
    fun onProgress(percent: Int) = _state.update { s ->
        s.copy(tabs = s.tabs.map { if (it.current) it.copy(progress = percent) else it })
    }
    fun onNavigated(url: String, title: String) = _state.update { s ->
        val host = runCatching { android.net.Uri.parse(url).host ?: "" }.getOrDefault("")
        val entry = HistoryEntry(UUID.randomUUID().toString(), title, host, "сейчас", "Сегодня")
        s.copy(
            tabs = s.tabs.map { if (it.current) it.copy(url = url, title = title, host = host) else it },
            history = if (s.stealth) s.history else (listOf(entry) + s.history).take(80)
        )
    }
}

/* ============================ app ============================ */

@Composable
fun NexApp(runtime: GeckoRuntime) {
    val vm: NexViewModel = viewModel(factory = object : androidx.lifecycle.ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T = NexViewModel(runtime) as T
    })
    val s by vm.state.collectAsState()

    NexTheme(mode = s.theme) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = { NexDock(s, vm) }
        ) { pad ->
            Box(Modifier.padding(pad).fillMaxSize()) {
                when (s.screen) {
                    Screen.START -> StartScreen(s, vm)
                    Screen.BROWSER -> BrowserScreen(s, vm)
                    Screen.TABS -> TabsScreen(s, vm)
                    Screen.SHIELD -> ShieldScreen(s, vm)
                    Screen.HISTORY -> HistoryScreen(s, vm)
                    Screen.SETTINGS -> SettingsScreen(s, vm)
                }
                AnimatedVisibility(
                    visible = s.findOpen,
                    enter = slideInVertically(initialOffsetY = { -it }) + fadeIn(),
                    exit = slideOutVertically(targetOffsetY = { -it }) + fadeOut(),
                    modifier = Modifier.align(Alignment.TopCenter)
                ) {
                    FindBar(s, vm)
                }
            }
        }
    }
}

/* ============================ start ============================ */

@Composable
private fun StartScreen(s: UiState, vm: NexViewModel) {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        item {
            Spacer(Modifier.height(13.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Pill(
                    accent = true,
                    onClick = { vm.go(Screen.SHIELD) },
                    icon = Icons.Outlined.Shield,
                    text = "${s.blocked} заблокировано"
                )
                Spacer(Modifier.weight(1f))
                ThemeChip(s.theme) { mode -> vm.setTheme(mode) }
            }
        }
        item {
            Spacer(Modifier.height(24.dp))
            Text(
                "Меньше шума.\nБольше тишины.",
                fontFamily = FontFamily.Serif,
                fontSize = 30.sp,
                lineHeight = 33.sp,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "${s.tabs.size} ${plural(s.tabs.size, "вкладка", "вкладки", "вкладок")} · ${s.blocked} запросов не дошли до рекламы",
                fontSize = 12.sp,
                color = NexColors.Muted
            )
            Spacer(Modifier.height(20.dp))
        }
        item { OmniField(s, vm) }
        item { QuickAccess(vm) }
        item {
            SectionHead("Продолжить чтение")
            ContinueCard { vm.go(Screen.BROWSER) }
        }
        item {
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Widget(Icons.Outlined.History, "История", "${s.history.size} страниц") { vm.go(Screen.HISTORY) }
                Widget(Icons.Outlined.BookmarkBorder, "Закладки", "локально") { vm.go(Screen.SETTINGS) }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Widget(Icons.Outlined.Shield, "Nex Shield", "6 правил", accent = true) { vm.go(Screen.SHIELD) }
                Widget(Icons.Outlined.VisibilityOff, "Инкогнито", if (s.stealth) "включено" else "выключено", stealth = s.stealth) { vm.toggleStealth() }
            }
            Spacer(Modifier.height(18.dp))
        }
        item { ShieldStrip(s) { vm.go(Screen.SHIELD) } }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun OmniField(s: UiState, vm: NexViewModel) {
    var text by remember { mutableStateOf("") }
    Row(
        Modifier
            .fillMaxWidth()
            .height(52.dp)
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(16.dp))
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(16.dp))
            .padding(horizontal = 15.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Outlined.Search, null, tint = NexColors.Faint, modifier = Modifier.size(17.dp))
        Spacer(Modifier.width(10.dp))
        BasicTextField(
            value = text,
            onValueChange = { text = it },
            singleLine = true,
            textStyle = LocalTextStyle.current.copy(fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                if (text.isEmpty()) {
                    Text("Поиск в ${s.engine.label} или адрес", fontSize = 14.sp, color = NexColors.Faint)
                }
                inner()
            }
        )
        if (text.isNotEmpty()) {
            CircleIcon(Icons.Outlined.ArrowForward, "Открыть") { vm.go(Screen.BROWSER) }
        }
    }
}

@Composable
private fun QuickAccess(vm: NexViewModel) {
    val sites = listOf("Habr" to "habr.com", "Wikipedia" to "wikipedia.org", "Gecko" to "geckoview.dev", "EFF" to "eff.org")
    Row(Modifier.fillMaxWidth().padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        sites.forEach { (label, host) ->
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(15.dp))
                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(15.dp))
                        .clickable { vm.go(Screen.BROWSER) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(host.take(1).uppercase(), fontWeight = FontWeight.SemiBold, fontSize = 15.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.height(6.dp))
                Text(label, fontSize = 10.sp, color = NexColors.Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

@Composable
private fun ContinueCard(onOpen: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(20.dp))
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(20.dp))
            .clickable { onOpen() }
            .padding(14.dp)
    ) {
        Text("habr.com · 7 мин · архитектура", fontSize = 10.sp, color = NexColors.Muted)
        Spacer(Modifier.height(6.dp))
        Text(
            "Тишина как материал: почему минимализм снова становится роскошью",
            fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f).height(2.5.dp).background(NexColors.Line, RoundedCornerShape(2.dp))) {
                Box(Modifier.fillMaxWidth(.34f).height(2.5.dp).background(NexColors.Accent, RoundedCornerShape(2.dp)))
            }
            Spacer(Modifier.width(8.dp))
            Text("34%", fontSize = 10.sp, color = NexColors.Muted)
        }
    }
}

@Composable
private fun ShieldStrip(s: UiState, onClick: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(NexColors.AccentSoft, RoundedCornerShape(20.dp))
            .border(1.dp, NexColors.Accent.copy(alpha = .25f), RoundedCornerShape(20.dp))
            .clickable { onClick() }
            .padding(15.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.Shield, null, tint = NexColors.Accent, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(7.dp))
            Text("Nex Shield — защита работает", fontSize = 11.sp, color = NexColors.Accent)
            Spacer(Modifier.weight(1f))
            Text("→", fontSize = 12.sp, color = NexColors.Accent.copy(alpha = .6f))
        }
        Spacer(Modifier.height(11.dp))
        Row {
            Stat("${s.blocked}", "запросов")
            Stat("23", "трекера")
            Stat("2.4 МБ", "сэкономлено")
        }
    }
}

@Composable
private fun Stat(value: String, label: String, first: Boolean = false) {
    Column(Modifier.weight(1f)) {
        Text(value, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
        Text(label, fontSize = 9.sp, color = NexColors.Muted)
    }
}

/* ============================ browser ============================ */

@Composable
private fun BrowserScreen(s: UiState, vm: NexViewModel) {
    val tab = s.currentTab
    var lastUrl by remember(tab.id) { mutableStateOf(tab.url) }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                GeckoView(ctx).apply {
                    val sess = GeckoSession(GeckoSessionSettings.Builder()
                        .usePrivateMode(tab.private)
                        .build())
                    sess.open(vm.runtime)
                    sess.progressDelegate = object : org.mozilla.geckoview.ProgressDelegate {
                        override fun onProgress(session: GeckoSession, progress: Int) = vm.onProgress(progress)
                        override fun onPageStart(session: GeckoSession, url: String) {}
                        override fun onPageStop(session: GeckoSession, success: Boolean) {
                            if (!success) return
                            vm.onNavigated(lastUrl, session.title ?: lastUrl)
                        }
                    }
                    sess.navigationDelegate = object : org.mozilla.geckoview.GeckoSession.NavigationDelegate {
                        override fun onLocationChange(session: GeckoSession, url: String?) {
                            if (!url.isNullOrBlank()) lastUrl = url
                        }
                    }
                    setSession(sess)
                    if (tab.url == "about:blank") sess.loadUri("about:blank") else sess.loadUri(tab.url)
                }
            },
            modifier = Modifier.fillMaxSize().padding(top = if (s.findOpen) 48.dp else 0.dp)
        )

        if (s.reader) {
            // Упрощённая читалка: читаемый режим Gecko включается через ReaderMode
            // (в прототипе — отдельная типографика; здесь переключаем настройки сессии).
            ReaderOverlay(tab) { vm.toggleReader() }
        }

        if (tab.progress in 1..99) {
            LinearProgressIndicator(
                progress = tab.progress / 100f,
                modifier = Modifier.fillMaxWidth().height(2.dp).align(Alignment.TopCenter),
                color = NexColors.Accent,
                trackColor = Color.Transparent,
                strokeCap = StrokeCap.Butt,
                drawStopIndicator = {}
            )
        }
    }
}

@Composable
private fun ReaderOverlay(tab: Tab, onClose: () -> Unit) {
    Surface(color = MaterialTheme.colorScheme.background, modifier = Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize().padding(20.dp)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircleIcon(Icons.Outlined.Close, "Закрыть читалку") { onClose() }
                }
                Spacer(Modifier.height(14.dp))
                Text(tab.host, fontSize = 10.sp, color = NexColors.Muted)
                Spacer(Modifier.height(8.dp))
                Text(
                    tab.title,
                    fontFamily = FontFamily.Serif,
                    fontSize = 27.sp,
                    lineHeight = 30.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Spacer(Modifier.height(14.dp))
                Text(
                    "Режим чтения убирает навигацию, рекламные блоки и оставляет текст. " +
                        "В настоящей сборке это ReaderModeDelegate Gecko: содержимое извлекается движком, " +
                        "типографика — на стороне Compose.",
                    fontSize = 15.sp, lineHeight = 26.sp, color = MaterialTheme.colorScheme.onBackground
                )
            }
        }
    }
}

@Composable
private fun FindBar(s: UiState, vm: NexViewModel) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Outlined.Search, null, tint = NexColors.Faint, modifier = Modifier.size(15.dp))
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value = s.findQuery,
            onValueChange = { vm.setFind(true, it) },
            singleLine = true,
            textStyle = LocalTextStyle.current.copy(fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant),
            modifier = Modifier.weight(1f)
        )
        Text("${s.findQuery.length}/0", fontSize = 10.sp, color = NexColors.Muted)
        Spacer(Modifier.width(8.dp))
        CircleIcon(Icons.Outlined.Close, "Закрыть поиск") { vm.setFind(false) }
    }
}

/* ============================ tabs ============================ */

@Composable
private fun TabsScreen(s: UiState, vm: NexViewModel) {
    var q by remember { mutableStateOf("") }
    val visible = s.tabs.filter { tab ->
        q.isBlank() || tab.title.contains(q, true) || tab.host.contains(q, true)
    }
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(14.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Вкладки", fontSize = 26.sp, fontWeight = FontWeight.Medium, letterSpacing = (-0.7).sp,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(Modifier.weight(1f))
            Pill(false, { vm.newTab() }, Icons.Outlined.Add, "Новая")
        }
        Spacer(Modifier.height(6.dp))
        Text(
            "${s.tabs.size} открыто · приватных ${s.tabs.count { it.private }}",
            fontSize = 11.sp, color = NexColors.Muted
        )
        Spacer(Modifier.height(12.dp))
        OmniSmall(q, "Найти вкладку") { q = it }
        Spacer(Modifier.height(12.dp))
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(visible, key = { it.id }) { tab ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(14.dp))
                        .border(
                            if (tab.current) 1.5.dp else 1.dp,
                            if (tab.current) MaterialTheme.colorScheme.onSurface
                            else MaterialTheme.colorScheme.outline.copy(alpha = .5f),
                            RoundedCornerShape(14.dp)
                        )
                        .clickable { vm.selectTab(tab.id) }
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier.size(30.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(9.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            (tab.host.ifEmpty { tab.title }).take(1).uppercase(),
                            fontSize = 11.sp, fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            tab.title, fontSize = 12.5.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(tab.host.ifEmpty { "nex://start" }, fontSize = 10.sp, color = NexColors.Muted)
                    }
                    if (tab.private) {
                        Icon(
                            Icons.Outlined.VisibilityOff, null,
                            tint = NexColors.Stealth, modifier = Modifier.size(15.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                    }
                    CircleIcon(Icons.Outlined.Close, "Закрыть вкладку") { vm.closeTab(tab.id) }
                }
            }
        }
    }
}

/* ============================ shield ============================ */

@Composable
private fun ShieldScreen(s: UiState, vm: NexViewModel) {
    val progress by animateFloatAsState((s.blocked / 1200f).coerceIn(0f, 1f), label = "dial")
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        item {
            Spacer(Modifier.height(14.dp))
            Text("NEX SHIELD", fontSize = 10.sp, letterSpacing = 1.2.sp, color = NexColors.Faint)
            Spacer(Modifier.height(16.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Box(Modifier.size(170.dp), contentAlignment = Alignment.Center) {
                    androidx.compose.foundation.Canvas(Modifier.fillMaxSize()) {
                        val stroke = Stroke(width = 6.5.dp.toPx(), cap = StrokeCap.Round)
                        drawArc(
                            color = NexColors.Line,
                            startAngle = -90f, sweepAngle = 360f, useCenter = false,
                            style = stroke
                        )
                        drawArc(
                            color = NexColors.Accent,
                            startAngle = -90f, sweepAngle = 360f * progress, useCenter = false,
                            style = stroke
                        )
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("${s.blocked}", fontSize = 36.sp, fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onBackground, letterSpacing = (-1.5).sp)
                        Text("заблокировано", fontSize = 9.5.sp, color = NexColors.Muted)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            Text("Фильтрация в сетевом стеке Gecko: запрос не уходит в сеть.", fontSize = 11.5.sp,
                color = NexColors.Muted, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(16.dp))
        }
        item {
            ShieldRow(Icons.Outlined.Campaign, "Блокировка рекламы", "uBlock-фильтры", "ads", s, vm)
            ShieldRow(Icons.Outlined.VisibilityOff, "Антитрекинг", "ETP strict", "track", s, vm)
            ShieldRow(Icons.Outlined.Layers, "Cookie-баннеры", "автоотклонение", "cookie", s, vm)
            ShieldRow(Icons.Outlined.Fingerprint, "Fingerprinting", "выравнивание отпечатка", "fp", s, vm)
            ShieldRow(Icons.Outlined.Link, "Чистка ссылок", "utm_*, fbclid, gclid", "strip", s, vm)
            ShieldRow(Icons.Outlined.Block, "Без телеметрии", "ноль запросов к аналитике", "telemetry", s, vm)
            Spacer(Modifier.height(16.dp))
        }
        item {
            Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(12.dp)) {
                Text(
                    "Все правила и счётчики живут на устройстве. Nex не отправляет статистику блокировок никуда.",
                    fontSize = 10.5.sp, lineHeight = 16.sp, color = NexColors.Muted,
                    modifier = Modifier.padding(12.dp)
                )
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ShieldRow(icon: ImageVector, title: String, desc: String, key: String, s: UiState, vm: NexViewModel) {
    val on = s.settings[key] ?: true
    Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(29.dp).background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) { Icon(icon, null, modifier = Modifier.size(15.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant) }
        Spacer(Modifier.width(11.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 12.5.sp, color = MaterialTheme.colorScheme.onBackground)
            Text(desc, fontSize = 10.5.sp, color = NexColors.Muted)
        }
        Switch(checked = on, onCheckedChange = { vm.toggleSetting(key) })
    }
}

/* ============================ history ============================ */

@Composable
private fun HistoryScreen(s: UiState, vm: NexViewModel) {
    var q by remember { mutableStateOf("") }
    val items = s.history.filter { q.isBlank() || it.title.contains(q, true) || it.host.contains(q, true) }
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(14.dp))
        Text("История", fontSize = 26.sp, fontWeight = FontWeight.Medium, letterSpacing = (-0.7).sp,
            color = MaterialTheme.colorScheme.onBackground)
        Spacer(Modifier.height(6.dp))
        Text(if (s.stealth) "Инкогнито: записи не сохраняются" else "Локально · 30 дней · синхронизации нет",
            fontSize = 11.sp, color = NexColors.Muted)
        Spacer(Modifier.height(12.dp))
        OmniSmall(q, "Поиск по истории") { q = it }
        Spacer(Modifier.height(12.dp))
        if (items.isEmpty()) {
            Text("Пока пусто. Здесь появляются только ваши страницы.", fontSize = 12.sp, color = NexColors.Muted)
        } else {
            LazyColumn {
                items(items, key = { it.id }) { e ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(e.title, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                color = MaterialTheme.colorScheme.onBackground)
                            Text("${e.host} · ${e.time}", fontSize = 10.sp, color = NexColors.Muted)
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = .4f))
                }
            }
        }
    }
}

/* ============================ settings ============================ */

@Composable
private fun SettingsScreen(s: UiState, vm: NexViewModel) {
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        item {
            Spacer(Modifier.height(14.dp))
            Text("Настройки", fontSize = 26.sp, fontWeight = FontWeight.Medium, letterSpacing = (-0.7).sp,
                color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.height(18.dp))
        }
        item {
            Label("Оформление")
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                NexThemeMode.entries.forEach { mode ->
                    val on = s.theme == mode
                    Column(
                        Modifier
                            .weight(1f)
                            .height(54.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
                            .border(if (on) 1.5.dp else 1.dp,
                                if (on) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.outline.copy(alpha = .5f),
                                RoundedCornerShape(10.dp))
                            .clickable { vm.setTheme(mode) },
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            when (mode) {
                                NexThemeMode.LIGHT -> "светлая"
                                NexThemeMode.DIM -> "dim"
                                NexThemeMode.DARK -> "тёмная"
                            },
                            fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
        }
        item {
            Label("Поиск")
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                SearchEngine.entries.forEach { e ->
                    val on = s.engine == e
                    Box(
                        Modifier
                            .weight(1f).height(34.dp)
                            .background(if (on) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(9.dp))
                            .clickable { vm.setEngine(e) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(e.label, fontSize = 10.5.sp,
                            color = if (on) MaterialTheme.colorScheme.background else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            Spacer(Modifier.height(18.dp))
        }
        item {
            Label("Приватность")
            SettingToggle("История страниц", "30 дней, потом удаляется", s.settings["history"] ?: true) { vm.toggleSetting("history") }
            SettingToggle("DNS поверх HTTPS", "провайдер не видит домены", s.settings["doh"] ?: true) { vm.toggleSetting("doh") }
            SettingToggle("Аппаратное ускорение", "WebRender", s.settings["hwaccel"] ?: true) { vm.toggleSetting("hwaccel") }
            Spacer(Modifier.height(18.dp))
        }
        item {
            Surface(
                Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shape = RoundedCornerShape(16.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f))
            ) {
                Column(Modifier.padding(14.dp)) {
                    Text("Nex Browser 0.3.0", fontSize = 12.5.sp, color = MaterialTheme.colorScheme.onSurface)
                    Text("GeckoView · Kotlin + Compose", fontSize = 10.sp, color = NexColors.Muted)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "Ни телеметрии, ни аккаунтов, ни аналитики. Движок и фильтры обновляются отдельно от APK.",
                        fontSize = 10.5.sp, lineHeight = 16.sp, color = NexColors.Muted
                    )
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SettingToggle(title: String, desc: String, on: Boolean, onChange: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 12.5.sp, color = MaterialTheme.colorScheme.onBackground)
            Text(desc, fontSize = 10.5.sp, color = NexColors.Muted)
        }
        Switch(checked = on, onCheckedChange = { onChange() })
    }
}

/* ============================ dock ============================ */

@Composable
private fun NexDock(s: UiState, vm: NexViewModel) {
    Surface(color = MaterialTheme.colorScheme.background, tonalElevation = 0.dp) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircleIcon(Icons.Outlined.ArrowBack, "Назад", enabled = s.screen != Screen.START) {
                vm.go(if (s.screen == Screen.SETTINGS) Screen.START else Screen.START)
            }
            Spacer(Modifier.width(6.dp))
            Row(
                Modifier
                    .weight(1f).height(38.dp)
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(12.dp))
                    .clickable { vm.go(Screen.START) }
                    .padding(horizontal = 11.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Outlined.Lock, null, tint = NexColors.Accent, modifier = Modifier.size(11.dp))
                Spacer(Modifier.width(7.dp))
                Text(
                    when (s.screen) {
                        Screen.BROWSER -> s.currentTab.host.ifEmpty { "nex://start" }
                        else -> "nex://" + s.screen.name.lowercase()
                    },
                    fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1, overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(Modifier.width(6.dp))
            Row(
                Modifier.height(38.dp)
                    .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(12.dp))
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(12.dp))
                    .clickable { vm.go(Screen.TABS) }
                    .padding(horizontal = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Outlined.Tab, null, modifier = Modifier.size(15.dp), tint = MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.width(5.dp))
                Text("${s.tabs.size}", fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurface)
            }
            Spacer(Modifier.width(2.dp))
            CircleIcon(Icons.Outlined.Menu, "Меню") { vm.go(Screen.SETTINGS) }
        }
    }
}

/* ============================ atoms ============================ */

@Composable
private fun CircleIcon(icon: ImageVector, label: String, enabled: Boolean = true, onClick: () -> Unit) {
    Box(
        Modifier.size(36.dp).clip(CircleShape).clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, label, modifier = Modifier.size(17.dp),
            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = if (enabled) .75f else .25f))
    }
}

@Composable
private fun Pill(accent: Boolean, onClick: () -> Unit, icon: ImageVector, text: String) {
    Row(
        Modifier
            .height(30.dp)
            .background(if (accent) NexColors.AccentSoft else MaterialTheme.colorScheme.surface, RoundedCornerShape(999.dp))
            .border(1.dp, if (accent) NexColors.Accent.copy(alpha = .3f) else MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(999.dp))
            .clickable { onClick() }
            .padding(horizontal = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, modifier = Modifier.size(13.dp), tint = if (accent) NexColors.Accent else MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.width(6.dp))
        Text(text, fontSize = 11.5.sp, color = if (accent) NexColors.Accent else MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ThemeChip(mode: NexThemeMode, onChange: (NexThemeMode) -> Unit) {
    val next = when (mode) {
        NexThemeMode.LIGHT -> NexThemeMode.DIM
        NexThemeMode.DIM -> NexThemeMode.DARK
        NexThemeMode.DARK -> NexThemeMode.LIGHT
    }
    Pill(false, { onChange(next) }, Icons.Outlined.LightMode,
        when (mode) { NexThemeMode.LIGHT -> "светлая"; NexThemeMode.DIM -> "dim"; NexThemeMode.DARK -> "тёмная" })
}

@Composable
private fun Widget(icon: ImageVector, title: String, desc: String, accent: Boolean = false, stealth: Boolean = false, onClick: () -> Unit) {
    Column(
        Modifier
            .weight(1f)
            .background(
                if (stealth) NexColors.Stealth.copy(alpha = .07f) else MaterialTheme.colorScheme.surface,
                RoundedCornerShape(16.dp)
            )
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(13.dp)
    ) {
        Box(
            Modifier.size(26.dp).background(
                if (accent) NexColors.AccentSoft else MaterialTheme.colorScheme.surfaceVariant,
                RoundedCornerShape(8.dp)
            ),
            contentAlignment = Alignment.Center
        ) { Icon(icon, null, modifier = Modifier.size(14.dp), tint = if (accent) NexColors.Accent else MaterialTheme.colorScheme.onSurfaceVariant) }
        Spacer(Modifier.height(9.dp))
        Text(title, fontSize = 12.5.sp, color = MaterialTheme.colorScheme.onSurface)
        Text(desc, fontSize = 10.5.sp, color = NexColors.Muted)
    }
}

@Composable
private fun SectionHead(text: String) {
    Row(Modifier.fillMaxWidth().padding(top = 22.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text.uppercase(), fontSize = 10.sp, letterSpacing = 1.1.sp, color = NexColors.Faint)
    }
}

@Composable
private fun Label(text: String) {
    Text(text.uppercase(), fontSize = 10.sp, letterSpacing = 1.1.sp, color = NexColors.Faint)
}

@Composable
private fun OmniSmall(value: String, placeholder: String, onChange: (String) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth().height(38.dp)
            .background(MaterialTheme.colorScheme.surface, RoundedCornerShape(11.dp))
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = .5f), RoundedCornerShape(11.dp))
            .padding(horizontal = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Outlined.Search, null, tint = NexColors.Faint, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value = value, onValueChange = onChange, singleLine = true,
            textStyle = LocalTextStyle.current.copy(fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                if (value.isEmpty()) Text(placeholder, fontSize = 12.sp, color = NexColors.Faint)
                inner()
            }
        )
    }
}

private fun plural(n: Int, one: String, few: String, many: String): String {
    val m10 = n % 10
    val m100 = n % 100
    return when {
        m10 == 1 && m100 != 11 -> one
        m10 in 2..4 && m100 !in 12..14 -> few
        else -> many
    }
}
