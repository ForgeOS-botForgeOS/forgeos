package com.forgeos.app

import android.content.Context
import android.content.Intent
import android.util.Base64
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.zip.ZipInputStream

/**
 * Over-the-air web-bundle updates. The APK ships a built-in web bundle; every
 * CI build on main also publishes that bundle as `web.zip` (+ `version.json`
 * with its git sha and SHA-256) on the rolling `app-latest` release. On launch
 * the JS side calls sync() with the sha of the bundle it is running; when the
 * release is newer we download the zip, verify its hash, unzip into app-private
 * storage and point Capacitor's local server at it — the app updates itself
 * without a new APK. A new APK is only needed when native code changes
 * (NATIVE_VERSION in version.json is greater than ours → sync reports
 * nativeUpdate and applies nothing).
 *
 * Rollback safety: the swap is marked pending until JS calls confirmBoot();
 * if a downloaded bundle is too broken to boot, the next launch reverts to the
 * built-in assets and blacklists that sha so it is never retried.
 */
@CapacitorPlugin(name = "WebUpdate")
class WebUpdatePlugin : Plugin() {

    companion object {
        // Bump whenever android/ code changes in a way the web bundle depends on.
        // CI greps this value into version.json.
        // 8: CAMERA permission for the barcode scanner. Older APKs must not
        // receive the scanner web bundle — Android would refuse the camera and
        // the app would blame a setting the user has no way to change.
        // 9 (2026-09-03): allowBackup=false — the manifest changed, so installs
        // still on 8 must not silently take a web bundle built against 9.
        // 10 (2026-10-13): location permissions for the gym check-in.
        // 11 (2026-11-01): the OTA bundle can now be signature-checked (see
        // OTA_PUBKEY_B64) and unzip refuses oversized archives.
        // Same release: a real notification icon (the anvil, not a blank square).
        const val NATIVE_VERSION = 11

        /**
         * Base64 X.509 (SubjectPublicKeyInfo) ECDSA P-256 public key that the
         * web bundle must be signed with. EMPTY = signature not required (the
         * old behaviour: only the SHA-256 from version.json, which lives in the
         * same release as the zip, so it proves integrity but not origin).
         *
         * Why it matters: the APK self-update is protected by Android's
         * signing-key check, but this OTA path swaps in *code that runs inside
         * the app* and was protected only by whoever can write to the GitHub
         * release. A stolen GitHub token, or a compromised release, could ship
         * script to every phone without the APK keystore. Setup: see
         * docs/ota-signing.md. Fill this in the SAME commit that adds the
         * OTA_SIGNING_KEY_PEM_B64 secret, and ship the APK before the first
         * signed release (an unsigned bundle is refused once this is set).
         */
        const val OTA_PUBKEY_B64 = ""

        /** Largest total size a web bundle may expand to. The real one is a few MB. */
        const val MAX_UNZIPPED_BYTES = 150L * 1024 * 1024

        const val PREFS = "forgeos-webupdate"
        const val KEY_PATH = "path"
        const val KEY_SHA = "sha"
        const val KEY_PENDING = "pendingConfirm"
        const val KEY_BAD_SHA = "badSha"
        const val VERSION_URL =
            "https://github.com/ForgeOS-botForgeOS/forgeos/releases/download/app-latest/version.json"
        const val ZIP_URL =
            "https://github.com/ForgeOS-botForgeOS/forgeos/releases/download/app-latest/web.zip"
        const val APK_URL =
            "https://github.com/ForgeOS-botForgeOS/forgeos/releases/download/app-latest/forgeos.apk"

        /** Bundle dir to serve on boot, or null for the built-in assets. */
        fun bootPath(context: Context): String? {
            val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (p.getBoolean(KEY_PENDING, false)) {
                // The last swap never confirmed booting — revert and never retry it.
                p.edit()
                    .putString(KEY_BAD_SHA, p.getString(KEY_SHA, null))
                    .remove(KEY_PATH)
                    .remove(KEY_SHA)
                    .putBoolean(KEY_PENDING, false)
                    .apply()
                return null
            }
            val path = p.getString(KEY_PATH, null) ?: return null
            return if (File(path, "index.html").isFile) path else null
        }
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /** Runs during bridge init, before the first page load. */
    override fun load() {
        bootPath(context)?.let { bridge.setServerBasePath(it) }
    }

    /** The running bundle booted fine — keep it across restarts. */
    @PluginMethod
    fun confirmBoot(call: PluginCall) {
        prefs().edit().putBoolean(KEY_PENDING, false).apply()
        call.resolve()
    }

    /**
     * Check the release manifest and apply any newer web bundle (the WebView
     * reloads onto it). Resolves { applied, nativeUpdate, sha? }; never rejects.
     */
    @PluginMethod
    fun sync(call: PluginCall) {
        val current = call.getString("currentSha") ?: ""
        scope.launch {
            val result = JSObject().put("applied", false).put("nativeUpdate", false)
            try {
                val manifest = JSONObject(fetchText(VERSION_URL))
                val sha = manifest.optString("sha")
                val wantSha256 = manifest.optString("zipSha256")
                if (manifest.optInt("nativeVersion", NATIVE_VERSION) > NATIVE_VERSION) {
                    // The release needs a newer APK; don't apply its web bundle.
                    call.resolve(result.put("nativeUpdate", true))
                    return@launch
                }
                val p = prefs()
                if (sha.isEmpty() || wantSha256.isEmpty() || sha == current ||
                    sha == p.getString(KEY_SHA, null) || sha == p.getString(KEY_BAD_SHA, null)
                ) {
                    call.resolve(result)
                    return@launch
                }
                val bytes = fetchBytes(ZIP_URL)
                if (!sha256Hex(bytes).equals(wantSha256, ignoreCase = true)) {
                    call.resolve(result)
                    return@launch
                }
                if (!signatureOk(bytes, manifest.optString("zipSig"))) {
                    call.resolve(result)
                    return@launch
                }
                val dir = File(context.filesDir, "web-updates/${sha.take(12)}")
                unzip(bytes, dir)
                if (!File(dir, "index.html").isFile) {
                    call.resolve(result)
                    return@launch
                }
                p.edit()
                    .putString(KEY_PATH, dir.absolutePath)
                    .putString(KEY_SHA, sha)
                    .putBoolean(KEY_PENDING, true)
                    .apply()
                cleanupOld(keep = dir.name)
                call.resolve(result.put("applied", true).put("sha", sha))
                activity.runOnUiThread { bridge.setServerBasePath(dir.absolutePath) }
            } catch (e: Exception) {
                call.resolve(result)
            }
        }
    }

    /**
     * Self-update the APK: download the newest release and hand it to Android's
     * package installer. The system shows its own confirmation UI — nothing
     * installs silently — and it verifies the new APK is signed with the same
     * key as the installed app, which is the integrity check that matters.
     * Resolves { started } once the installer has been launched.
     */
    @PluginMethod
    fun installApkUpdate(call: PluginCall) {
        scope.launch {
            try {
                val dir = File(context.cacheDir, "apk-updates")
                if (dir.exists()) dir.deleteRecursively()
                dir.mkdirs()
                val apk = File(dir, "forgeos.apk")
                downloadToFile(APK_URL, apk)
                val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
                call.resolve(JSObject().put("started", true))
            } catch (e: Exception) {
                call.resolve(JSObject().put("started", false))
            }
        }
    }

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun fetchText(url: String) = fetchBytes(url).toString(Charsets.UTF_8)

    private fun fetchBytes(url: String): ByteArray {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 60_000
        conn.instanceFollowRedirects = true
        try {
            if (conn.responseCode != 200) throw IllegalStateException("HTTP ${conn.responseCode}")
            return conn.inputStream.use { it.readBytes() }
        } finally {
            conn.disconnect()
        }
    }

    /** Stream a download straight to disk (APKs are too big to buffer in RAM). */
    private fun downloadToFile(url: String, out: File) {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 120_000
        conn.instanceFollowRedirects = true
        try {
            if (conn.responseCode != 200) throw IllegalStateException("HTTP ${conn.responseCode}")
            conn.inputStream.use { input -> FileOutputStream(out).use { input.copyTo(it) } }
        } finally {
            conn.disconnect()
        }
    }

    /** ECDSA P-256 / SHA-256 over the raw zip bytes. Always true while no key is pinned. */
    private fun signatureOk(bytes: ByteArray, sigB64: String): Boolean {
        if (OTA_PUBKEY_B64.isEmpty()) return true
        if (sigB64.isEmpty()) return false
        return try {
            val key = KeyFactory.getInstance("EC")
                .generatePublic(X509EncodedKeySpec(Base64.decode(OTA_PUBKEY_B64, Base64.DEFAULT)))
            val verifier = Signature.getInstance("SHA256withECDSA")
            verifier.initVerify(key)
            verifier.update(bytes)
            verifier.verify(Base64.decode(sigB64, Base64.DEFAULT))
        } catch (e: Exception) {
            false
        }
    }

    private fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    private fun unzip(bytes: ByteArray, dir: File) {
        if (dir.exists()) dir.deleteRecursively()
        dir.mkdirs()
        val root = dir.canonicalPath + File.separator
        var written = 0L
        ZipInputStream(ByteArrayInputStream(bytes)).use { zip ->
            var entry = zip.nextEntry
            while (entry != null) {
                val out = File(dir, entry.name)
                // Zip-slip guard: every entry must stay inside the target dir.
                if (!out.canonicalPath.startsWith(root)) throw SecurityException("bad zip entry: ${entry.name}")
                if (entry.isDirectory) {
                    out.mkdirs()
                } else {
                    out.parentFile?.mkdirs()
                    // Zip-bomb guard: count what actually comes out, not what the header claims.
                    FileOutputStream(out).use { sink ->
                        val buf = ByteArray(16 * 1024)
                        while (true) {
                            val n = zip.read(buf)
                            if (n < 0) break
                            written += n
                            if (written > MAX_UNZIPPED_BYTES) throw SecurityException("bundle too large")
                            sink.write(buf, 0, n)
                        }
                    }
                }
                entry = zip.nextEntry
            }
        }
    }

    private fun cleanupOld(keep: String) {
        File(context.filesDir, "web-updates").listFiles()?.forEach {
            if (it.name != keep) it.deleteRecursively()
        }
    }
}
