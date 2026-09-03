// One-tap backup/restore of all ForgeOS data (everything lives under forge-* in
// localStorage). Export downloads a JSON file; import restores then reloads.
// The same dump powers cloud sync (see lib/cloudSync.ts).
export const BACKUP_KEYS = [
  'forge-settings',
  'forge-user',
  'forge-workouts',
  'forge-gami',
  'forge-social',
  'forge-nutrition',
  'forge-quotes',
  'forge-cosmetics',
  'forge-imports',
];

export type BackupDump = Record<string, unknown>;

/**
 * Settings, minus anything that protects the device rather than describing it.
 *
 * The app-lock passcode used to ride along in every export and every cloud
 * backup — so a file people happily share, and a database row, both carried the
 * key to the lock screen. It is stripped on the way out and preserved (never
 * overwritten) on the way in, which also stops a hostile "backup" from simply
 * turning the lock off.
 */
function settingsForExport(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    if (parsed?.state && 'appLock' in parsed.state) {
      delete parsed.state.appLock;
      return JSON.stringify(parsed);
    }
  } catch {
    /* unparseable settings: fall through and ship it as-is */
  }
  return raw;
}

function settingsForImport(incoming: string, current: string | null): string {
  try {
    const next = JSON.parse(incoming) as { state?: Record<string, unknown> };
    const mine = current ? (JSON.parse(current) as { state?: Record<string, unknown> }) : null;
    if (next?.state) {
      // The lock on THIS device always wins, whatever the file says.
      if (mine?.state?.appLock) next.state.appLock = mine.state.appLock;
      else delete next.state.appLock;
      return JSON.stringify(next);
    }
  } catch {
    /* not JSON — rejected by the caller's validation below */
  }
  return incoming;
}

export function collectDump(): BackupDump {
  const dump: BackupDump = { _app: 'ForgeOS', _version: 1, _exportedAt: new Date().toISOString() };
  for (const k of BACKUP_KEYS) {
    const v = localStorage.getItem(k);
    if (v == null) continue;
    dump[k] = k === 'forge-settings' ? settingsForExport(v) : v;
  }
  return dump;
}

/** Every blob in a backup is a JSON string we are about to trust. Check it. */
function isRestorableBlob(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 8_000_000) return false;
  try {
    const parsed = JSON.parse(v);
    return !!parsed && typeof parsed === 'object';
  } catch {
    return false;
  }
}

export function applyDump(dump: BackupDump): void {
  if (dump._app !== 'ForgeOS') throw new Error('Not a ForgeOS backup.');
  for (const k of BACKUP_KEYS) {
    const v = dump[k];
    if (!isRestorableBlob(v)) continue;
    localStorage.setItem(k, k === 'forge-settings' ? settingsForImport(v, localStorage.getItem(k)) : v);
  }
}

export function exportData(): void {
  const blob = new Blob([JSON.stringify(collectDump(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forgeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<void> {
  const dump = JSON.parse(await file.text()) as BackupDump;
  applyDump(dump);
  location.reload(); // re-hydrate every store from restored data
}
