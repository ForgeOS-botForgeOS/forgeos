# Shipping a signed release APK

CI currently builds a **debug-signed** APK (`assembleDebug`) — fine for direct
sideloading from the website. For a Play-Store-grade signed **release** build,
add your own keystore (this can't be done for you — the key is your secret).

## 1. Create a keystore (once, locally)
```bash
keytool -genkey -v -keystore forgeos.keystore -alias forgeos \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 forgeos.keystore > forgeos.keystore.b64   # macOS: base64 -i forgeos.keystore
```

## 2. Add GitHub repo secrets
`ANDROID_KEYSTORE_BASE64` (contents of the `.b64`), `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS` (`forgeos`), `ANDROID_KEY_PASSWORD`.

## 3. Wire `android/app/build.gradle`
```groovy
android {
  signingConfigs {
    release {
      storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
      storePassword System.getenv("KEYSTORE_PASSWORD")
      keyAlias System.getenv("KEY_ALIAS")
      keyPassword System.getenv("KEY_PASSWORD")
    }
  }
  buildTypes { release { signingConfig signingConfigs.release } }
}
```

## 4. In `.github/workflows/android.yml`, before the gradle step
```yaml
- name: Decode keystore
  if: ${{ secrets.ANDROID_KEYSTORE_BASE64 != '' }}
  run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > forgeos/android/app/release.keystore
- name: Build release APK
  if: ${{ secrets.ANDROID_KEYSTORE_BASE64 != '' }}
  working-directory: forgeos
  env:
    KEYSTORE_PATH: app/release.keystore
    KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
  run: cd android && ./gradlew assembleRelease --no-daemon
```
Then publish `android/app/build/outputs/apk/release/app-release.apk` instead of
the debug APK. The debug path stays as a fallback when no secret is set, so the
pipeline never breaks for contributors without the key.
```
