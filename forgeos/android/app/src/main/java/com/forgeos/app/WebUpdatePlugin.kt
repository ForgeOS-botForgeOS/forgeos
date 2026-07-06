package com.forgeos.app

import android.content.Context
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
import java.security.MessageDigest
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
        const val NATIVE_VERSION = 2

        const val PREFS = "forgeos-webupdate"
        const val KEY_PATH = "path"
        const val KEY_SHA = "sha"
        const val KEY_PENDING = "pendingConfirm"
        const val KEY_BAD_SHA = "badSha"
        const val VERSION_URL =
            "https://github.com/ForgeOS-botForgeOS/forgeos/releases/download/app-latest/version.json"
        const val ZIP_URL =
            "https://github.com/ForgeOS-botForgeOS/forgeos/releases/download/app-latest/web.zip"

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

    private fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

    private fun unzip(bytes: ByteArray, dir: File) {
        if (dir.exists()) dir.deleteRecursively()
        dir.mkdirs()
        val root = dir.canonicalPath + File.separator
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
                    FileOutputStream(out).use { zip.copyTo(it) }
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
