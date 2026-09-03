import { beforeEach, describe, expect, it } from 'vitest';
import { applyDump, collectDump } from './backup';

// A tiny localStorage so the pure backup rules can be tested without a browser.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}

const settings = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ state: { language: 'en', appLock: { enabled: true, code: 'SECRET-HASH' }, ...extra }, version: 0 });

beforeEach(() => {
  (globalThis as { localStorage: Storage }).localStorage = new MemoryStorage() as unknown as Storage;
  localStorage.setItem('forge-settings', settings());
  localStorage.setItem('forge-user', JSON.stringify({ state: { profile: { name: 'Peter' } } }));
});

describe('collectDump', () => {
  it('leaves the app lock out of the exported file', () => {
    const dump = collectDump();
    expect(JSON.stringify(dump)).not.toContain('SECRET-HASH');
    expect(JSON.parse(dump['forge-settings'] as string).state.appLock).toBeUndefined();
    // …while still exporting everything else.
    expect(JSON.parse(dump['forge-settings'] as string).state.language).toBe('en');
    expect(dump['forge-user']).toContain('Peter');
  });
});

describe('applyDump', () => {
  it('refuses a file that is not a ForgeOS backup', () => {
    expect(() => applyDump({ _app: 'SomethingElse', 'forge-user': '{}' })).toThrow();
  });

  it('cannot turn off the lock on this device', () => {
    applyDump({ _app: 'ForgeOS', 'forge-settings': JSON.stringify({ state: { language: 'sk', appLock: { enabled: false, code: '' } } }) });
    const after = JSON.parse(localStorage.getItem('forge-settings')!);
    expect(after.state.appLock).toEqual({ enabled: true, code: 'SECRET-HASH' }); // mine, not theirs
    expect(after.state.language).toBe('sk'); // the rest of the restore still applies
  });

  it('does not add a lock that this device never had', () => {
    localStorage.setItem('forge-settings', JSON.stringify({ state: { language: 'en' } }));
    applyDump({ _app: 'ForgeOS', 'forge-settings': settings() });
    expect(JSON.parse(localStorage.getItem('forge-settings')!).state.appLock).toBeUndefined();
  });

  it('ignores blobs that are not JSON objects', () => {
    const before = localStorage.getItem('forge-user');
    applyDump({ _app: 'ForgeOS', 'forge-user': 'not json', 'forge-workouts': 42 });
    expect(localStorage.getItem('forge-user')).toBe(before);
    expect(localStorage.getItem('forge-workouts')).toBeNull();
  });
});
