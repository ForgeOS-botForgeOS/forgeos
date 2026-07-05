package com.forgeos.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.result.ActivityResult
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.health.connect.client.PermissionController
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

/**
 * Reads wearable data from Android Health Connect — the hub that the Garmin
 * Connect app writes sleep, steps, heart rate and calories into. The JS side
 * (src/lib/healthConnect.ts) calls isAvailable → requestAuthorization → readDays,
 * plus configureBackgroundSync/drainCache for the closed-app sync path.
 *
 * Read-only: we never write to Health Connect, and nothing leaves the device.
 * The heavy lifting lives in HealthReader so HealthSyncWorker can reuse it.
 */
@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("available", HealthReader.sdkAvailable(context)))
    }

    @PluginMethod
    fun requestAuthorization(call: PluginCall) {
        val hc = HealthReader.client(context)
        if (hc == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (granted.containsAll(HealthReader.readPerms)) {
                    call.resolve(JSObject().put("granted", true))
                } else {
                    // Also ask for background reads so the periodic worker can run
                    // with the app closed; optional — grant check below ignores it.
                    val wanted = HealthReader.readPerms + HealthReader.BACKGROUND_READ_PERMISSION
                    val intent = PermissionController
                        .createRequestPermissionResultContract()
                        .createIntent(context, wanted)
                    startActivityForResult(call, intent, "permsResult")
                }
            } catch (e: Exception) {
                call.resolve(JSObject().put("granted", false))
            }
        }
    }

    @ActivityCallback
    fun permsResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        scope.launch {
            val granted = try {
                HealthReader.client(context)?.permissionController?.getGrantedPermissions() ?: emptySet()
            } catch (e: Exception) {
                emptySet()
            }
            call.resolve(JSObject().put("granted", granted.containsAll(HealthReader.readPerms)))
        }
    }

    @PluginMethod
    fun readDays(call: PluginCall) {
        val days = call.getInt("days") ?: 14
        val hc = HealthReader.client(context)
        if (hc == null) {
            call.reject("Health Connect unavailable")
            return
        }
        scope.launch {
            try {
                val arr = HealthReader.readDays(hc, days)
                call.resolve(JSObject().put("days", JSArray(arr.toString())))
            } catch (e: Exception) {
                call.reject(e.message ?: "read failed")
            }
        }
    }

    /**
     * Schedule (or cancel) the periodic background sync worker. `interactive`
     * marks a user-initiated call (the Connect button / settings toggle) where
     * prompting for the Android 13+ notification permission is acceptable.
     */
    @PluginMethod
    fun configureBackgroundSync(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: true
        val notify = call.getBoolean("notify") ?: true
        val interactive = call.getBoolean("interactive") ?: false
        val bedtime = call.getBoolean("bedtime") ?: true
        context.getSharedPreferences(HealthReader.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(HealthReader.KEY_NOTIFY, notify)
            .putBoolean(HealthReader.KEY_BEDTIME, bedtime)
            .apply()
        val wm = WorkManager.getInstance(context)
        if (enabled) {
            val req = PeriodicWorkRequestBuilder<HealthSyncWorker>(6, TimeUnit.HOURS)
                .setInitialDelay(30, TimeUnit.MINUTES)
                .build()
            wm.enqueueUniquePeriodicWork("forgeos-health-sync", ExistingPeriodicWorkPolicy.UPDATE, req)
            if (interactive && notify && Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 9377)
            }
        } else {
            wm.cancelUniqueWork("forgeos-health-sync")
        }
        call.resolve()
    }

    /** Return whatever the background worker cached while the app was closed. */
    @PluginMethod
    fun drainCache(call: PluginCall) {
        val prefs = context.getSharedPreferences(HealthReader.PREFS, Context.MODE_PRIVATE)
        val raw = prefs.getString(HealthReader.KEY_CACHE, null)
        val days = if (raw == null) JSArray() else try { JSArray(raw) } catch (e: Exception) { JSArray() }
        call.resolve(
            JSObject()
                .put("days", days)
                .put("cachedAt", prefs.getLong(HealthReader.KEY_CACHED_AT, 0L))
        )
    }
}
