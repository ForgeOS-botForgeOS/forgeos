import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APP_ICONS, DEFAULT_APP_ICON } from './appIcon';

// The icon colour list lives in four places (this lib, the manifest aliases,
// res/values and AppIconPlugin.kt). Read the native side as text (no Android
// SDK here) and fail if they drift, or if the app could end up with no
// launcher entry or two.

const main = join(__dirname, '../../android/app/src/main');
const manifest = readFileSync(join(main, 'AndroidManifest.xml'), 'utf8');
const colors = readFileSync(join(main, 'res/values/icon_colors.xml'), 'utf8') + readFileSync(join(main, 'res/values/ic_launcher_background.xml'), 'utf8');
const plugin = readFileSync(join(main, 'java/com/forgeos/app/AppIconPlugin.kt'), 'utf8');
const activity = readFileSync(join(main, 'java/com/forgeos/app/MainActivity.java'), 'utf8');
const cap = (id: string) => id[0].toUpperCase() + id.slice(1);

const aliases = [...manifest.matchAll(/<activity-alias([\s\S]*?)<\/activity-alias>/g)].map((m) => m[1]);
const launchers = aliases.filter((a) => a.includes('android.intent.category.LAUNCHER'));

describe('app icon colours', () => {
  it('every colour has exactly one launcher alias with its own icon', () => {
    expect(launchers).toHaveLength(APP_ICONS.length);
    for (const { id } of APP_ICONS) {
      const alias = launchers.find((a) => a.includes(`android:name=".Launcher${cap(id)}"`));
      expect(alias, id).toBeTruthy();
      const icon = id === DEFAULT_APP_ICON ? 'ic_launcher' : `ic_launcher_${id}`;
      expect(alias).toContain(`android:icon="@mipmap/${icon}"`);
      expect(alias).toContain('android:targetActivity=".MainActivity"');
      expect(existsSync(join(main, `res/mipmap-anydpi-v26/${icon}.xml`)), icon).toBe(true);
    }
  });

  it('only the default is enabled, and MainActivity is not a second launcher entry', () => {
    const enabled = launchers.filter((a) => a.includes('android:enabled="true"'));
    expect(enabled).toHaveLength(1);
    expect(enabled[0]).toContain(`.Launcher${cap(DEFAULT_APP_ICON)}"`);
    const main = /<activity\b[\s\S]*?android:name="\.MainActivity"[\s\S]*?<\/activity>/.exec(manifest)?.[0] ?? '';
    expect(main).not.toContain('android.intent.category.LAUNCHER');
  });

  it('the native colours match the swatches the picker shows', () => {
    for (const { id, hex } of APP_ICONS) {
      const name = id === DEFAULT_APP_ICON ? 'ic_launcher_background' : `icon_${id}`;
      expect(colors, id).toMatch(new RegExp(`name="${name}">${hex}<`, 'i'));
      expect(plugin, id).toContain(`"${id}" to R.color.${name}`);
      if (id !== DEFAULT_APP_ICON) {
        expect(readFileSync(join(main, `res/mipmap-anydpi-v26/ic_launcher_${id}.xml`), 'utf8')).toContain(`@color/icon_${id}`);
      }
    }
  });

  it('the plugin is registered and enables the new icon before disabling the old', () => {
    expect(activity).toContain('registerPlugin(AppIconPlugin.class)');
    const enable = plugin.indexOf('COMPONENT_ENABLED_STATE_ENABLED');
    const disable = plugin.indexOf('COMPONENT_ENABLED_STATE_DISABLED');
    expect(enable).toBeGreaterThan(0);
    expect(disable).toBeGreaterThan(enable);
    expect(plugin).toContain('DONT_KILL_APP');
  });
});
