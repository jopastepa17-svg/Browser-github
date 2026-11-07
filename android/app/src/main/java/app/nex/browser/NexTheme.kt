package app.nex.browser

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/* Токены 0.3: бумага / ink / зелёный акцент. Три темы — light, dim, dark. */
object NexColors {
    val Paper = Color(0xFFFAFAF8)
    val Paper2 = Color(0xFFF1F1EB)
    val Card = Color(0xFFFFFFFF)
    val Ink = Color(0xFF121310)
    val Ink2 = Color(0xFF3F413B)
    val Muted = Color(0xFF8B8D84)
    val Faint = Color(0xFFB3B5AB)
    val Line = Color(0x17121310)
    val Accent = Color(0xFF2C6B57)
    val AccentSoft = Color(0x172C6B57)
    val Stealth = Color(0xFF4B4B6B)

    // dim
    val DimPaper = Color(0xFF1B1C18)
    val DimCard = Color(0xFF232420)
    val DimInk = Color(0xFFF3F3EC)
    val DimMuted = Color(0xFF94968C)
    val DimAccent = Color(0xFF86C5AC)

    // dark
    val DarkPaper = Color(0xFF0C0D0B)
    val DarkCard = Color(0xFF151714)
    val DarkInk = Color(0xFFF5F5EF)
    val DarkMuted = Color(0xFF83857D)
    val DarkAccent = Color(0xFF8ACFB3)
}

enum class NexThemeMode { LIGHT, DIM, DARK }

private val LightScheme = lightColorScheme(
    primary = NexColors.Accent,
    onPrimary = NexColors.Paper,
    background = NexColors.Paper,
    onBackground = NexColors.Ink,
    surface = NexColors.Card,
    onSurface = NexColors.Ink,
    surfaceVariant = NexColors.Paper2,
    onSurfaceVariant = NexColors.Ink2,
    outline = NexColors.Line
)

private val DimScheme = darkColorScheme(
    primary = NexColors.DimAccent,
    onPrimary = NexColors.DarkPaper,
    background = NexColors.DimPaper,
    onBackground = NexColors.DimInk,
    surface = NexColors.DimCard,
    onSurface = NexColors.DimInk,
    surfaceVariant = Color(0xFF24251F),
    onSurfaceVariant = Color(0xFFCBCBC1)
)

private val DarkScheme = darkColorScheme(
    primary = NexColors.DarkAccent,
    onPrimary = NexColors.DarkPaper,
    background = NexColors.DarkPaper,
    onBackground = NexColors.DarkInk,
    surface = NexColors.DarkCard,
    onSurface = NexColors.DarkInk,
    surfaceVariant = Color(0xFF141612),
    onSurfaceVariant = Color(0xFFBCBEB4)
)

private val NexTypography = Typography(
    headlineLarge = TextStyle(fontFamily = FontFamily.Serif, fontSize = 30.sp, lineHeight = 34.sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 26.sp, fontWeight = FontWeight.Medium, letterSpacing = (-0.6).sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 15.sp, fontWeight = FontWeight.Medium),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 14.sp, lineHeight = 23.sp),
    labelSmall = TextStyle(fontFamily = FontFamily.SansSerif, fontSize = 10.sp, letterSpacing = 1.sp, fontWeight = FontWeight.Medium)
)

@Composable
fun NexTheme(mode: NexThemeMode = if (isSystemInDarkTheme()) NexThemeMode.DIM else NexThemeMode.LIGHT, content: @Composable () -> Unit) {
    val scheme = when (mode) {
        NexThemeMode.LIGHT -> LightScheme
        NexThemeMode.DIM -> DimScheme
        NexThemeMode.DARK -> DarkScheme
    }
    MaterialTheme(colorScheme = scheme, typography = NexTypography, content = content)
}

/** Старая сигнатура для MainActivity: тёмная система -> dim. */
@Composable
fun NexTheme(darkTheme: Boolean, content: @Composable () -> Unit) =
    NexTheme(if (darkTheme) NexThemeMode.DIM else NexThemeMode.LIGHT, content)
