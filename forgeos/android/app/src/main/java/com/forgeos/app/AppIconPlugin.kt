package com.forgeos.app

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Switches the launcher icon colour. Android has no API to repaint an icon at
 * runtime, so each colour is its own activity-alias (AndroidManifest.xml,
 * LauncherX) with its own adaptive icon, and exactly one alias is enabled.
 * The choice is remembered so notifications are tinted to match.
 */
@CapacitorPlugin(name = "AppIcon")
class AppIconPlugin : Plugin() {

    companion object {
        private const val PREFS = "forge_app_icon"
        private const val KEY = "icon"
        const val DEFAULT = "orange"

        // Keep in step with src/lib/appIcon.ts and the manifest aliases.
        val COLORS: Map<String, Int> = linkedMapOf(
            "orange" to R.color.ic_launcher_background,
            "red" to R.color.icon_red,
            "pink" to R.color.icon_pink,
            "violet" to R.color.icon_violet,
            "blue" to R.color.icon_blue,
            "cyan" to R.color.icon_cyan,
            "green" to R.color.icon_green,
            "gold" to R.color.icon_gold,
            "graphite" to R.color.icon_graphite,
            "midnight" to R.color.icon_midnight,
        )

        fun current(ctx: Context): String {
            val id = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, DEFAULT) ?: DEFAULT
            return if (COLORS.containsKey(id)) id else DEFAULT
        }

        /** Notification accent: the chosen icon colour. */
        fun tint(ctx: Context): Int = ContextCompat.getColor(ctx, COLORS.getValue(current(ctx)))

        private fun alias(ctx: Context, id: String) =
            ComponentName(ctx, "${MainActivity::class.java.name.substringBeforeLast('.')}.Launcher${id.replaceFirstChar { it.uppercase() }}")
    }

    @PluginMethod
    fun get(call: PluginCall) {
        call.resolve(JSObject().put("icon", current(context)))
    }

    @PluginMethod
    fun set(call: PluginCall) {
        val id = call.getString("icon")
        if (id == null || !COLORS.containsKey(id)) {
            call.reject("unknown icon")
            return
        }
        try {
            val pm = context.packageManager
            // Enable the new one first so the app is never left without a launcher entry.
            pm.setComponentEnabledSetting(alias(context, id), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
            for (other in COLORS.keys) {
                if (other == id) continue
                pm.setComponentEnabledSetting(alias(context, other), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
            }
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, id).apply()
            call.resolve(JSObject().put("icon", id))
        } catch (e: Exception) {
            call.reject("could not change the icon", e)
        }
    }
}
