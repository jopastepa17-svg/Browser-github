pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
        // GeckoView публикуется только здесь
        maven("https://maven.mozilla.org/maven2/")
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven("https://maven.mozilla.org/maven2/")
    }
}

rootProject.name = "NexBrowser"
include(":app")
