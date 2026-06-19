import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, X, Loader2 } from 'lucide-react';
import { Card, Button } from './ui';
import { isBackendLive, currentAuthUser } from '../lib/supabase';
import { useSocial } from '../state/socialStore';
import { pushMyActivity } from '../lib/activitySync';
import { toast } from '../lib/toast';
import { haptic } from '../lib/haptics';

// Shows the real state of the live social backend so it's never a black box:
// is a backend configured, are you signed in to a cloud account, how many real
// friends are synced — and a one-tap "Sync now". This is what turns
// "social doesn't work" into a clear, fixable diagnosis.
export function CloudStatus() {
  const friends = useSocial((s) => s.friends);
  const syncFriends = useSocial((s) => s.syncFriends);
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>('checking');
  const [email, setEmail] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const u = await currentAuthUser();
    setAuth(u ? 'in' : 'out');
    setEmail(u?.email);
  }
  useEffect(() => { void refresh(); }, []);

  async function syncNow() {
    setBusy(true);
    haptic('tap');
    try {
      await pushMyActivity();
      await syncFriends();
      await refresh();
      toast(isBackendLive ? 'Synced with the cloud ✅' : 'No cloud backend connected', isBackendLive ? 'success' : 'info');
    } catch {
      toast('Sync failed — check your connection / backend.', 'error');
    } finally {
      setBusy(false);
    }
  }

  const signedIn = auth === 'in';
  const hint = !isBackendLive
    ? 'No cloud backend connected on this build — social runs locally. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.'
    : auth === 'checking'
      ? 'Checking your cloud session…'
      : !signedIn
        ? 'Signed in on this device only. Create an account with EMAIL to get a real cloud session — friends & activity then sync for real. (Google currently signs in for profile only.)'
        : `Connected as ${email ?? 'your account'}. ${friends.length} friend${friends.length === 1 ? '' : 's'} synced. Add friends by invite link to see real activity.`;

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        {isBackendLive ? <Cloud size={16} className="text-accent" /> : <CloudOff size={16} className="text-muted" />}
        <p className="font-semibold text-sm flex-1">Cloud & social</p>
        <Button variant="ghost" className="px-3 py-1.5" disabled={busy} onClick={syncNow}>
          <span className="flex items-center gap-1 text-xs">{busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Sync now</span>
        </Button>
      </div>
      <div className="space-y-1.5 text-sm">
        <StatusRow label="Backend connected" ok={isBackendLive} />
        <StatusRow label="Signed in to cloud account" ok={signedIn} pending={auth === 'checking'} />
        <StatusRow label="Real friends synced" ok={signedIn && friends.length > 0} value={`${friends.length}`} />
      </div>
      <p className="text-[11px] text-muted">{hint}</p>
    </Card>
  );
}

function StatusRow({ label, ok, pending, value }: { label: string; ok: boolean; pending?: boolean; value?: string }) {
  return (
    <div className="flex items-center gap-2">
      {pending ? <Loader2 size={14} className="animate-spin text-muted" /> : ok ? <Check size={14} className="text-success" /> : <X size={14} className="text-danger" />}
      <span className="flex-1 text-muted">{label}</span>
      {value !== undefined && <span className="font-mono text-xs">{value}</span>}
    </div>
  );
}
