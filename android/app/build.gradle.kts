plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val animetealKeystorePath = System.getenv("ANIMETEAL_KEYSTORE_FILE")
val animetealKeystorePassword = System.getenv("ANIMETEAL_KEYSTORE_PASSWORD")

android {
    namespace = "com.imtealplayz.animeteal"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.imtealplayz.animeteal"
        minSdk = 24
        targetSdk = 35
        versionCode = 4
        versionName = "2.2.0"
    }

    signingConfigs {
        create("release") {
            storeFile = file(animetealKeystorePath ?: "missing-animeteal-release.p12")
            storeType = "PKCS12"
            storePassword = animetealKeystorePassword
            keyAlias = "animeteal"
            keyPassword = animetealKeystorePassword
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")

    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
