package com.forgeos.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalTime

/**
 * Periodic background sync: reads Health Connect while ForgeOS is closed and
 * caches the result for the web layer to drain on next launch. In the morning
 * window it also posts a readiness notification (score ported from
 * src/lib/readiness.ts — sleep-vs-8h weighted 3, resting HR vs baseline 2).
 *
 * Every failure path is a silent no-op: background reads can legitimately be
 * denied (older Health Connect, permission not granted) and the app still
 * syncs on every open, so this worker must never retry-spam or crash.
 */
class HealthSyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        val ctx = applicationContext
        val prefs = ctx.getSharedPreferences(HealthReader.PREFS, Context.MODE_PRIVATE)
        try {
            val hc = HealthReader.client(ctx) ?: return Result.success()
            if (!HealthReader.hasPermissions(hc)) return Result.success()
            val arr = HealthReader.readDays(hc, 14)
            if (arr.length() > 0) {
                prefs.edit()
                    .putString(HealthReader.KEY_CACHE, arr.toString())
                    .putLong(HealthReader.KEY_CACHED_AT, System.currentTimeMillis())
                    .apply()
            }
            maybeNotifyReadiness(ctx, prefs, arr)
            maybeBedtimeNudge(ctx, prefs, arr)
        } catch (e: Exception) {
            // e.g. SecurityException when background reads aren't permitted.
        }
        return Result.success()
    }

    private fun maybeNotifyReadiness(ctx: Context, prefs: SharedPreferences, arr: JSONArray) {
        if (!prefs.getBoolean(HealthReader.KEY_NOTIFY, true)) return
        val hour = LocalTime.now().hour
        if (hour < 6 || hour > 11) return
        val today = LocalDate.now().toString()
        if (prefs.getString(HealthReader.KEY_LAST_NOTIFY_DATE, "") == today) return
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val items = ArrayList<JSONObject>(arr.length())
        for (i in 0 until arr.length()) items.add(arr.getJSONObject(i))
        items.sortByDescending { it.optString("date") }
        val latest = items.firstOrNull() ?: return
        // Only speak up about fresh data (last night / yesterday).
        if (latest.optString("date") < LocalDate.now().minusDays(1).toString()) return

        val priorRhr = items.drop(1).mapNotNull { if (it.has("restingHr")) it.getLong("restingHr") else null }
        val baseline = if (priorRhr.size >= 3) median(priorRhr) else null
        val score = readinessScore(latest, baseline) ?: return
        val (label, advice) = tierText(score)

        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Recovery readiness", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val open = PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(ctx.applicationInfo.icon)
            .setContentTitle("Readiness $score — $label")
            .setContentText(advice)
            .setStyle(NotificationCompat.BigTextStyle().bigText(advice))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(ctx).notify(NOTIFICATION_ID, notification)
        prefs.edit().putString(HealthReader.KEY_LAST_NOTIFY_DATE, today).apply()
    }

    /**
     * Evening nudge (20:00–22:59, once per day, toggleable): if the week's
     * sleep debt is building or last night was short, remind before bed —
     * the one moment the advice can still change tonight's outcome.
     */
    private fun maybeBedtimeNudge(ctx: Context, prefs: SharedPreferences, arr: JSONArray) {
        if (!prefs.getBoolean(HealthReader.KEY_BEDTIME, true)) return
        if (!prefs.getBoolean(HealthReader.KEY_NOTIFY, true)) return
        val hour = LocalTime.now().hour
        if (hour < 20 || hour > 22) return
        val today = LocalDate.now().toString()
        if (prefs.getString(HealthReader.KEY_LAST_BEDTIME_DATE, "") == today) return
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        // Sleep debt vs 8h across the last 7 nights + last night's duration.
        var debtMin = 0L
        var lastNight = -1L
        val weekAgo = LocalDate.now().minusDays(7).toString()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val date = o.optString("date")
            if (date < weekAgo || !o.has("sleepMinutes")) continue
            val m = o.getLong("sleepMinutes")
            debtMin += maxOf(0L, 480L - m)
            if (date >= today) lastNight = m
        }
        val text = when {
            debtMin >= 120 -> "You're carrying ${debtMin / 60}h of sleep debt this week. Tonight is the comeback — aim for 8h+ 😴"
            lastNight in 1 until 420 -> "Last night was short (${lastNight / 60}h ${lastNight % 60}m). An early night = a better readiness score tomorrow 🔥"
            else -> return // sleeping fine — don't nag
        }

        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Recovery readiness", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val open = PendingIntent.getActivity(
            ctx, 0, Intent(ctx, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val notification = NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(ctx.applicationInfo.icon)
            .setContentTitle("Bedtime check-in")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(ctx).notify(BEDTIME_NOTIFICATION_ID, notification)
        prefs.edit().putString(HealthReader.KEY_LAST_BEDTIME_DATE, today).apply()
    }

    /** Weighted average over available signals; mirrors computeReadiness in readiness.ts. */
    private fun readinessScore(day: JSONObject, baselineRhr: Double?): Int? {
        var total = 0.0
        var weight = 0.0
        if (day.has("sleepMinutes")) {
            val s = clamp(day.getLong("sleepMinutes") / 480.0 * 100.0)
            total += s * 3; weight += 3.0
        }
        if (day.has("restingHr")) {
            val rhr = day.getLong("restingHr").toDouble()
            if (baselineRhr != null && baselineRhr > 0) {
                val delta = rhr - baselineRhr
                val s = clamp(90.0 - maxOf(0.0, delta) * 7.0 + maxOf(-10.0, minOf(0.0, delta)) * -2.0)
                total += s * 2; weight += 2.0
            } else {
                total += 70.0 * 0.5; weight += 0.5
            }
        }
        if (weight == 0.0) return null
        return Math.round(total / weight).toInt()
    }

    private fun tierText(score: Int): Pair<String, String> = when {
        score >= 85 -> "Primed 🔥" to "Green light — go for a PR or your hardest session."
        score >= 70 -> "Ready ✅" to "Well recovered — train as planned."
        score >= 50 -> "Maintain 🟡" to "A bit under — keep volume moderate, nail technique."
        score >= 30 -> "Run-down 🟠" to "Fatigued — drop the load or make today a deload."
        else -> "Rest 🔴" to "Running on empty — prioritise sleep and active recovery."
    }

    private fun median(xs: List<Long>): Double {
        val s = xs.sorted()
        val m = s.size / 2
        return if (s.size % 2 == 1) s[m].toDouble() else (s[m - 1] + s[m]) / 2.0
    }

    private fun clamp(n: Double, lo: Double = 0.0, hi: Double = 100.0): Double =
        maxOf(lo, minOf(hi, n))

    companion object {
        private const val CHANNEL_ID = "recovery"
        private const val NOTIFICATION_ID = 4177
        private const val BEDTIME_NOTIFICATION_ID = 4178
    }
}
