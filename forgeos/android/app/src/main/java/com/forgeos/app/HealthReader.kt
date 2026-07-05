package com.forgeos.app

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * Health Connect read logic shared by the foreground plugin (HealthConnectPlugin)
 * and the background worker (HealthSyncWorker). Read-only; nothing leaves the device.
 */
object HealthReader {

    val readPerms = setOf(
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class),
    )

    // Lets the periodic worker read while the app is closed. Optional: granted
    // only on Health Connect versions that know it; the worker degrades to a
    // no-op without it because the app still syncs on every open.
    const val BACKGROUND_READ_PERMISSION = "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"

    // SharedPreferences file shared between the plugin and the worker.
    const val PREFS = "forgeos-health"
    const val KEY_CACHE = "cache"
    const val KEY_CACHED_AT = "cachedAt"
    const val KEY_NOTIFY = "notify"
    const val KEY_LAST_NOTIFY_DATE = "lastNotifyDate"
    const val KEY_BEDTIME = "bedtimeNudge"
    const val KEY_LAST_BEDTIME_DATE = "lastBedtimeDate"

    fun sdkAvailable(context: Context): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    fun client(context: Context): HealthConnectClient? =
        if (sdkAvailable(context)) HealthConnectClient.getOrCreate(context) else null

    suspend fun hasPermissions(hc: HealthConnectClient): Boolean =
        hc.permissionController.getGrantedPermissions().containsAll(readPerms)

    /** Per-local-day aggregation of sleep / steps / resting HR / active calories. */
    suspend fun readDays(hc: HealthConnectClient, days: Int): JSONArray {
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
        val arr = JSONArray()
        for (k in keys) {
            val o = JSONObject()
            o.put("date", k)
            sleep[k]?.let { o.put("sleepMinutes", it) }
            steps[k]?.let { o.put("steps", it) }
            cals[k]?.let { o.put("activeCalories", Math.round(it)) }
            val n = hrCount[k]
            if (n != null && n > 0) o.put("restingHr", Math.round(hrSum[k]!!.toDouble() / n))
            arr.put(o)
        }
        return arr
    }
}
