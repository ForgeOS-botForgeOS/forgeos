import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { Sheet, Button } from './ui';
import { updatePassword, recovery } from '../lib/supabase';
import { toast } from '../lib/toast';
import { haptic } from '../lib/haptics';

// Handles the "forgot password" return: when a recovery link establishes a
// session, this overlay lets the user set a new password right here in the app
// (instead of being dumped at a sign-in screen they can't get past). Mounted at
// the app root so it can appear over any screen.
export function PasswordReset() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recovery.requested) setOpen(true); // fired before mount
    const onEv = () => setOpen(true);
    window.addEventListener('forge:password-recovery', onEv);
    return () => window.removeEventListener('forge:password-recovery', onEv);
  }, []);

  async function save() {
    if (pw.length < 6) { toast('Use at least 6 characters.', 'error'); return; }
    setBusy(true);
    const res = await updatePassword(pw);
    setBusy(false);
    if ('error' in res && res.error) {
      toast(typeof res.error === 'string' ? res.error : (res.error as { message?: string }).message ?? 'Could not update password.', 'error');
      return;
    }
    haptic('success');
    toast('Password updated — you’re signed in ✅', 'success');
    recovery.requested = false;
    setPw('');
    setOpen(false);
  }

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Set a new password">
      <div className="space-y-3">
        <p className="text-[11px] text-muted flex items-start gap-1.5">
          <KeyRound size={13} className="mt-0.5 shrink-0 text-accent" />
          You opened a password-reset link. Choose a new password — you’ll be signed in right away.
        </p>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && pw.length >= 6) save(); }}
            placeholder="New password"
            autoFocus
            className="w-full rounded-xl bg-surface-2 border border-line px-4 py-3 text-sm pr-10"
          />
          <button onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <Button className="w-full justify-center" disabled={busy || pw.length < 6} onClick={save}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Update password'}
        </Button>
      </div>
    </Sheet>
  );
}
