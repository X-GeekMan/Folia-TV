plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "top.izuna.foliatv"
    compileSdk = 35

    defaultConfig {
        applicationId = "top.izuna.foliatv"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        // First-run API settings. Bundled Folia UI loads from assets/www after config.
        buildConfigField(
            "String",
            "DEFAULT_START_URL",
            "\"file:///android_asset/settings.html\""
        )
    }

    signingConfigs {
        create("release") {
            val ksFile = rootProject.file("keystore/folia-tv-release.jks")
            if (ksFile.exists()) {
                storeFile = ksFile
                storePassword = System.getenv("FOLIA_TV_STORE_PASSWORD") ?: "foliatv2026"
                keyAlias = System.getenv("FOLIA_TV_KEY_ALIAS") ?: "foliatv"
                keyPassword = System.getenv("FOLIA_TV_KEY_PASSWORD") ?: "foliatv2026"
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            val releaseSigning = signingConfigs.findByName("release")
            if (releaseSigning?.storeFile?.exists() == true) {
                signingConfig = releaseSigning
            }
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.media:media:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
