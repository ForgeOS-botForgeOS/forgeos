package com.forgeos.app

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
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
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * Reads wearable data from Android Health Connect — the hub that the Garmin
 * Connect app writes sleep, steps, heart rate and calories into. The JS side
 * (src/lib/healthConnect.ts) calls isAvailable → requestAuthorization → readDays.
 *
 * Read-only: we never write to Health Connect, and nothing leaves the device.
 */
@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val readPerms = setOf(
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    )

    private fun sdkAvailable(): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    private fun client(): HealthConnectClient? =
        if (sdkAvailable()) HealthConnectClient.getOrCreate(context) else null

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("available", sdkAvailable()))
    }

    @PluginMethod
    fun requestAuthorization(call: PluginCall) {
        val hc = client()
        if (hc == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            try {
                val granted = hc.permissionController.getGrantedPermissions()
                if (granted.containsAll(readPerms)) {
                    call.resolve(JSObject().put("granted", true))
                } else {
                    val intent = PermissionController
                        .createRequestPermissionResultContract()
                        .createIntent(context, readPerms)
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
                client()?.permissionController?.getGrantedPermissions() ?: emptySet()
            } catch (e: Exception) {
                emptySet()
            }
            call.resolve(JSObject().put("granted", granted.containsAll(readPerms)))
        }
    }

    @PluginMethod
    fun readDays(call: PluginCall) {
        val days = call.getInt("days") ?: 14
        val hc = client()
        if (hc == null) {
            call.reject("Health Connect unavailable")
            return
        }
        scope.launch {
            try {
                val end = Instant.now()
                val start = end.minus(days.toLong(), ChronoUnit.DAYS)
                val range = TimeRangeFilter.between(start, end)
                val zone = ZoneId.systemDefault()
                fun key(i: Instant): String = LocalDate.ofInstant(i, zone).toString()

                val sleep = HashMap<String, Long>()
                val steps = HashMap<String, Long>()
                val cals = HashMap<String, Double>()
                val hrSum = HashMap<String, Long>()
                val hrCount = HashMap<String, Int>()

                // Sleep is bucketed by the morning it ended (matches how trackers label a night).
                hc.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range)).records.forEach { r ->
                    val k = key(r.endTime)
                    sleep[k] = (sleep[k] ?: 0L) + Duration.between(r.startTime, r.endTime).toMinutes()
                }
                hc.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records.forEach { r ->
                    val k = key(r.startTime)
                    steps[k] = (steps[k] ?: 0L) + r.count
                }
                hc.readRecords(ReadRecordsRequest(ActiveCaloriesBurnedRecord::class, range)).records.forEach { r ->
                    val k = key(r.startTime)
                    cals[k] = (cals[k] ?: 0.0) + r.energy.inKilocalories
                }
                hc.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records.forEach { r ->
                    val k = key(r.time)
                    hrSum[k] = (hrSum[k] ?: 0L) + r.beatsPerMinute
                    hrCount[k] = (hrCount[k] ?: 0) + 1
                }

                val keys = HashSet<String>().apply {
                    addAll(sleep.keys); addAll(steps.keys); addAll(cals.keys); addAll(hrSum.keys)
                }
                val arr = JSArray()
                for (k in keys) {
                    val o = JSObject()
                    o.put("date", k)
                    sleep[k]?.let { o.put("sleepMinutes", it) }
                    steps[k]?.let { o.put("steps", it) }
                    cals[k]?.let { o.put("activeCalories", Math.round(it)) }
                    val n = hrCount[k]
                    if (n != null && n > 0) o.put("restingHr", Math.round(hrSum[k]!!.toDouble() / n))
                    arr.put(o)
                }
                call.resolve(JSObject().put("days", arr))
            } catch (e: Exception) {
                call.reject(e.message ?: "read failed")
            }
        }
    }
}
