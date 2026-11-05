import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Android draws a notification's small icon from the alpha channel only. The
// launcher icon is an opaque tile, so using it rendered as an empty rounded
// square. These read the native source as text (no Android SDK here).

const res = join(__dirname, '../../android/app/src/main/res');
const worker = readFileSync(join(__dirname, '../../android/app/src/main/java/com/forgeos/app/HealthSyncWorker.kt'), 'utf8');
const icon = readFileSync(join(res, 'drawable/ic_stat_forge.xml'), 'utf8');

describe('notification small icon', () => {
  it('every notification uses the anvil silhouette, never the launcher icon', () => {
    expect(worker).not.toContain('applicationInfo.icon');
    const builders = worker.match(/NotificationCompat\.Builder\(/g) ?? [];
    const icons = worker.match(/\.setSmallIcon\(R\.drawable\.ic_stat_forge\)/g) ?? [];
    const tints = worker.match(/\.setColor\(/g) ?? [];
    expect(builders.length).toBeGreaterThan(0);
    expect(icons.length).toBe(builders.length);
    expect(tints.length).toBe(builders.length);
  });

  it('the icon is a single-colour white vector on a 24dp canvas', () => {
    expect(icon).toContain('android:viewportWidth="24"');
    const fills = [...icon.matchAll(/android:fillColor="([^"]+)"/g)].map((m) => m[1]);
    expect(fills).toEqual(['#FFFFFFFF']);
    expect(icon).not.toMatch(/gradient|strokeColor/);
  });

  it('the notification text has no em dashes', () => {
    const strings = worker.split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
    const visible = strings.flatMap((l) => l.match(/"[^"]*"/g) ?? []);
    expect(visible.filter((s) => s.includes('—'))).toEqual([]);
  });
});
