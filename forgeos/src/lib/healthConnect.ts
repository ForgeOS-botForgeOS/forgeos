import { Capacitor, registerPlugin } from '@capacitor/core';
import type { HealthDay } from '../types';

// Bridge to Android Health Connect — the hub that the Garmin Connect app writes
// your sleep, steps, heart rate and calories into. We read from it so ForgeOS
// reflects Garmin data automatically, with no Garmin developer account needed.
//
// This file is capability-detected: on the website (or any device without the
// native plugin) every call degrades to a clear "not available" instead of
// throwing. The matching native implementation ships only in the Capacitor APK.

interface NativeDay {
  date: string; // 'YYYY-MM-DD'
  sleepMinutes?: number;
  steps?: number;
  restingHr?: number;
  activeCalories?: number;
}

interface HealthConnectPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(options: { read: string[] }): Promise<{ granted: boolean }>;
  readDays(options: { days: number }): Promise<{ days: NativeDay[] }>;
  configureBackgroundSync(options: { enabled: boolean; notify: boolean; interactive: boolean }): Promise<void>;
  drainCache(): Promise<{ days: NativeDay[]; cachedAt: number }>;
}

// registerPlugin returns a proxy even when no native side exists; calls reject
// with "not implemented" off-Android, which we treat as "unavailable".
const Native = registerPlugin<HealthConnectPlugin>('HealthConnect');

const READ_TYPES = ['SleepSession', 'Steps', 'RestingHeartRate', 'ActiveCaloriesBurned'];

/** True only on the native Android app where the plugin can exist at all. */
export function platformSupportsHealthConnect(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
}

/** Whether Health Connect is actually installed & the plugin responds on this device. */
export async function healthConnectAvailable(): Promise<boolean> {
  if (!platformSupportsHealthConnect()) return false;
  try {
    const r = await Native.isAvailable();
    return !!r.available;
  } catch {
    return false;
  }
}

/** Ask the user for read permission on sleep / activity types. */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (!platformSupportsHealthConnect()) return false;
  try {
    const r = await Native.requestAuthorization({ read: READ_TYPES });
    return !!r.granted;
  } catch {
    return false;
  }
}

function toHealthDays(rows: NativeDay[] | undefined): HealthDay[] {
  const now = Date.now();
  return (rows ?? [])
    .filter((d) => d.date)
    .map((d) => ({
      date: d.date,
      sleepMinutes: d.sleepMinutes,
      steps: d.steps,
      restingHr: d.restingHr,
      activeCalories: d.activeCalories,
      source: 'healthconnect' as const,
      updatedAt: now,
    }));
}

/** Pull the last `days` of data and map to HealthDay rows. Empty on any failure. */
export async function readHealthConnect(days = 14): Promise<HealthDay[]> {
  if (!platformSupportsHealthConnect()) return [];
  try {
    const r = await Native.readDays({ days });
    return toHealthDays(r.days);
  } catch {
    return [];
  }
}

/**
 * Schedule (enabled=true) or cancel the native background sync worker, which
 * keeps Garmin data flowing while the app stays closed and can post a morning
 * readiness notification. `interactive` marks a user-initiated call where
 * prompting for the Android 13+ notification permission is okay.
 */
export async function configureBackgroundSync(
  enabled: boolean,
  opts: { notify?: boolean; interactive?: boolean } = {},
): Promise<void> {
  if (!platformSupportsHealthConnect()) return;
  try {
    await Native.configureBackgroundSync({
      enabled,
      notify: opts.notify ?? true,
      interactive: opts.interactive ?? false,
    });
  } catch {
    // APKs older than this method just no-op.
  }
}

/** Days the background worker cached while the app was closed. Empty on any failure. */
export async function drainHealthCache(): Promise<HealthDay[]> {
  if (!platformSupportsHealthConnect()) return [];
  try {
    const r = await Native.drainCache();
    return toHealthDays(r.days);
  } catch {
    return [];
  }
}
