// One-tap backup/restore of all ForgeOS data (everything lives under forge-* in
// localStorage). Export downloads a JSON file; import restores then reloads.
const KEYS = [
  'forge-settings',
  'forge-user',
  'forge-workouts',
  'forge-gami',
  'forge-social',
  'forge-nutrition',
  'forge-quotes',
];

export function exportData(): void {
  const dump: Record<string, unknown> = { _app: 'ForgeOS', _version: 1, _exportedAt: new Date().toISOString() };
  for (const k of KEYS) {
    const v = localStorage.getItem(k);
    if (v != null) dump[k] = v;
  }
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forgeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file: File): Promise<void> {
  const text = await file.text();
  const dump = JSON.parse(text) as Record<string, unknown>;
  if (dump._app !== 'ForgeOS') throw new Error('Not a ForgeOS backup file.');
  for (const k of KEYS) {
    if (typeof dump[k] === 'string') localStorage.setItem(k, dump[k] as string);
  }
  location.reload(); // re-hydrate every store from restored data
}
