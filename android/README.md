# Nex Browser — Android (Kotlin + GeckoView)

Версия 0.3.0 · `minSdk 24` · `targetSdk 34` · Compose · GeckoView

## Как получить APK

**Способ 1 — GitHub Actions (рекомендуется).** Файл `.github/workflows/android.yml` собирает
`app-debug.apk` на раннере GitHub, где есть и JDK, и Android SDK, и доступ к `maven.mozilla.org`.

1. Вкладка **Actions** → workflow **Android APK** → **Run workflow**.
2. Дождитесь зелёной галочки (~6–10 минут: первый запуск качает Gradle, SDK и GeckoView).
3. Внизу страницы запуска — блок **Artifacts** → `nex-browser-debug-apk`.
4. Распакуйте архив, перенесите `app-debug.apk` на телефон, разрешите установку из этого источника.

Workflow также сам определяет актуальную версию GeckoView (128.x) по
`maven-metadata.xml` и подставляет её в `gradle.properties`, поэтому вручную версию менять не нужно.

**Способ 2 — локально.** Нужны JDK 17 и Android SDK (platform 34, build-tools 34):

```bash
cd android
echo "sdk.dir=$HOME/Android/Sdk" > local.properties
./gradlew :app:assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

Если `gradle-wrapper.jar` когда-нибудь удалят из репозитория, восстановите его командой
`gradle wrapper --gradle-version 8.9` или скачайте из тега Gradle на GitHub.

## Что уже реализовано в коде

| Экран | Файл | Состояние |
|---|---|---|
| Старт (омнибокс, быстрый доступ, виджеты, полоса Shield) | `NexApp.kt` | готово |
| Просмотр страницы | `NexApp.kt` + `GeckoView` | готово, один движок на процесс |
| Вкладки: список, поиск, приватные | `NexApp.kt` | готово |
| Nex Shield: 6 переключателей, кольцевой счётчик | `NexApp.kt` | UI готов, счётчики — задел |
| История | `NexApp.kt` | в памяти процесса |
| Настройки: 3 темы, движок поиска, приватность | `NexApp.kt` | готово |
| Три темы (light/dim/dark) | `NexTheme.kt` | готово |
| Чистка utm-меток, нормализация ввода | `NexEngine.kt` | готово |

## Что подключается следующим шагом

1. **Счётчики блокировок.** `ContentBlockingDelegate` на сессии → `onContentBlocked` →
   `vm.onBlocked(1)`. Сейчас цифры на экране Shield — из состояния, а не из движка.
2. **Режим чтения на движке.** `ReaderModeDelegate` вместо оверлея-заглушки.
3. **Find-in-page.** `session.finder.find(query, options)`.
4. **Постоянные вкладки.** Room для истории, закладок и групп; `GeckoSession.saveState()` для восстановления.
5. **Подписка-фильтры.** `ContentBlockingController` + скачивание списков EasyList в фоне.
6. **Подпись release.** `keytool` → `keystore.properties` → `assembleRelease`.

## Почему не WebView

`WebView` отдаёт системный Chromium без контроля над сетевым стеком: рекламу нельзя отрезать
до отправки запроса. `GeckoView` позволяет это делать, поддерживает WebExtensions и не зависит
от обновлений Chrome. Цена — размер APK (≈40–60 МБ) и сборка через `maven.mozilla.org`.
