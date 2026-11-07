# GeckoView содержит нативные JNI-точки входа и рефлексию — не трогаем.
-keep class org.mozilla.geckoview.** { *; }
-keep class org.mozilla.gecko.** { *; }
-dontwarn org.mozilla.**

# Compose
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**
