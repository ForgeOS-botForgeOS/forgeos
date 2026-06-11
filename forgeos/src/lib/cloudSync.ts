import { supabase, isBackendLive, currentAuthUser } from './supabase';
import { collectDump, applyDump, type BackupDump } from './backup';

// Cloud backup so progress survives clearing the browser / switching devices.
// Stores the whole forge-* dump as one JSON blob per user (table `user_backups`).
// Everything no-ops gracefully when signed out or with no backend configured.

export type SyncResult = 'ok' | 'restored' | 'none' | 'unauth' | 'offline' | 'error';

export const cloudSyncAvailable = () => isBackendLive;

export async function pushCloudBackup(): Promise<SyncResult> {
  if (!isBackendLive || !supabase) return 'offline';
  const user = await currentAuthUser();
  if (!user) return 'unauth';
  try {
    const { error } = await supabase.from('user_backups').upsert({ user_id: user.id, data: collectDump(), updated_at: new Date().toISOString() });
    return error ? 'error' : 'ok';
  } catch {
    return 'error';
  }
}

export async function cloudBackupAt(): Promise<string | null> {
  if (!isBackendLive || !supabase) return null;
  const user = await currentAuthUser();
  if (!user) return null;
  try {
    const { data } = await supabase.from('user_backups').select('updated_at').eq('user_id', user.id).single();
    return data?.updated_at ?? null;
  } catch {
    return null;
  }
}

/** Pull the cloud backup and apply it. Caller decides whether to reload. */
export async function pullCloudBackup(): Promise<SyncResult> {
  if (!isBackendLive || !supabase) return 'offline';
  const user = await currentAuthUser();
  if (!user) return 'unauth';
  try {
    const { data, error } = await supabase.from('user_backups').select('data').eq('user_id', user.id).single();
    if (error || !data?.data) return 'none';
    applyDump(data.data as BackupDump);
    return 'restored';
  } catch {
    return 'error';
  }
}
