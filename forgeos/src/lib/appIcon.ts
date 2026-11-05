import { Capacitor, registerPlugin } from '@capacitor/core';

// The Android launcher icon colour. Android cannot repaint an icon at runtime,
// so each colour is a separate activity-alias with its own adaptive icon
// (AndroidManifest.xml LauncherX, res/values/icon_colors.xml); AppIconPlugin
// enables exactly one. APKs older than NATIVE_VERSION 11 have no plugin, and
// the website's icon is fixed by the web manifest, so the picker hides there.

export const APP_ICONS = [
  { id: 'orange', hex: '#FF5C35' },
  { id: 'red', hex: '#E11D48' },
  { id: 'pink', hex: '#DB2777' },
  { id: 'violet', hex: '#7C3AED' },
  { id: 'blue', hex: '#2563EB' },
  { id: 'cyan', hex: '#0891B2' },
  { id: 'green', hex: '#16A34A' },
  { id: 'gold', hex: '#CA8A04' },
  { id: 'graphite', hex: '#374151' },
  { id: 'midnight', hex: '#0B0E14' },
] as const;

export type AppIconId = (typeof APP_ICONS)[number]['id'];
export const DEFAULT_APP_ICON: AppIconId = 'orange';

export const isAppIconId = (v: unknown): v is AppIconId => APP_ICONS.some((i) => i.id === v);

interface AppIconNative {
  get(): Promise<{ icon: string }>;
  set(o: { icon: AppIconId }): Promise<{ icon: string }>;
}
const Native = registerPlugin<AppIconNative>('AppIcon');

export function appIconSwitchAvailable(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AppIcon');
}

export async function getAppIcon(): Promise<AppIconId> {
  if (!appIconSwitchAvailable()) return DEFAULT_APP_ICON;
  try {
    const { icon } = await Native.get();
    return isAppIconId(icon) ? icon : DEFAULT_APP_ICON;
  } catch {
    return DEFAULT_APP_ICON;
  }
}

/** True when the launcher was told to switch. Never throws. */
export async function setAppIcon(id: AppIconId): Promise<boolean> {
  if (!appIconSwitchAvailable() || !isAppIconId(id)) return false;
  try {
    await Native.set({ icon: id });
    return true;
  } catch {
    return false;
  }
}
