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

export function collectDump(): BackupDump {
  const dump: BackupDump = { _app: 'ForgeOS', _version: 1, _exportedAt: new Date().toISOString() };
  for (const k of BACKUP_KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) dump[k] = v;
  }
  return dump;
}

export function applyDump(dump: BackupDump): void {
  if (dump._app !== 'ForgeOS') throw new Error('Not a ForgeOS backup.');
  for (const k of BACKUP_KEYS) {
    if (typeof dump[k] === 'string') localStorage.setItem(k, dump[k] as string);
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
