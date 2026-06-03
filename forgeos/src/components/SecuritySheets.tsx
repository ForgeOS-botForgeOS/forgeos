import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Check, KeyRound, ShieldCheck } from 'lucide-react';
import { Sheet, Button } from './ui';
import { supabase, isBackendLive, currentAuthUser } from '../lib/supabase';
import { haptic } from '../lib/haptics';

const field = 'w-full rounded-xl bg-surface-2 border border-line px-4 py-3 text-sm outline-none focus:border-accent transition-colors';

function strength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || (/[a-zA-Z]/.test(pw) && /[0-9]/.test(pw))) s++;
  const score = Math.min(s, 3) as 0 | 1 | 2 | 3;
  return { score, label: ['Too short', 'Weak', 'Good', 'Strong'][score] };
}

/** Polished account-password change — replaces the old prompt()/alert() flow. */
export function ChangePasswordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) { setPw(''); setConfirm(''); setShow(false); setBusy(false); setErr(null); setDone(false); }
  }, [open]);

  const st = strength(pw);
  const tooShort = pw.length > 0 && pw.length < 6;
  const mismatch = confirm.length > 0 && confirm !== pw;
  const valid = pw.length >= 6 && confirm === pw;

  async function submit() {
    if (!valid || busy) return;
    if (!isBackendLive || !supabase) { setErr('Password changes need an email account — this build is running in demo mode.'); return; }
    setErr(null);
    setBusy(true);
    // No active session = signed in as guest/Google or the session expired.
    const user = await currentAuthUser();
    if (!user) {
      setBusy(false);
      setErr('You’re not logged in with an email account. Log out and log back in with your email & password, then change it here.');
      haptic('warning');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      const msg = /session/i.test(error.message)
        ? 'Your login session has expired. Log in again with your email & password, then retry.'
        : error.message;
      setErr(msg);
      haptic('warning');
      return;
    }
    setDone(true);
    haptic('success');
    setTimeout(onClose, 1100);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Change password">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
            <ShieldCheck className="text-accent" size={30} />
          </div>
          <p className="font-semibold">Password updated</p>
          <p className="text-xs text-muted">You’ll use your new password next time you log in.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">Choose a new password for your account. Minimum 6 characters.</p>

          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className={field}
            />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide' : 'Show'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* strength meter */}
          {pw.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < st.score ? (st.score === 1 ? 'bg-danger' : st.score === 2 ? 'bg-amber-400' : 'bg-accent') : 'bg-surface-2'}`} />
                ))}
              </div>
              <span className="w-16 text-right text-[11px] text-muted">{st.label}</span>
            </div>
          )}

          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className={field}
          />

          {tooShort && <p className="text-[11px] text-danger">Use at least 6 characters.</p>}
          {mismatch && <p className="text-[11px] text-danger">Passwords don’t match.</p>}
          {err && <p className="text-xs text-danger">{err}</p>}

          <Button className="w-full justify-center gap-2" disabled={!valid || busy} onClick={submit}>
            {busy ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : <><KeyRound size={16} /> Update password</>}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** Polished numeric passcode set/change — replaces prompt()/alert(). */
export function PasscodeSheet({ open, mode, onClose, onSave }: { open: boolean; mode: 'set' | 'change'; onClose: () => void; onSave: (code: string) => void }) {
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) { setCode(''); setConfirm(''); setShow(false); setDone(false); }
  }, [open]);

  const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 8);
  const tooShort = code.length > 0 && code.length < 4;
  const mismatch = confirm.length > 0 && confirm !== code;
  const valid = code.length >= 4 && code.length <= 8 && confirm === code;

  function submit() {
    if (!valid) return;
    onSave(code);
    setDone(true);
    haptic('success');
    setTimeout(onClose, 900);
  }

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'set' ? 'Set passcode' : 'Change passcode'}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15"><ShieldCheck className="text-accent" size={30} /></div>
          <p className="font-semibold">Passcode {mode === 'set' ? 'set' : 'updated'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">A 4–8 digit code, asked for each time the app launches.</p>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(onlyDigits(e.target.value))}
              placeholder="New passcode"
              className={`${field} tracking-[0.4em]`}
            />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide' : 'Show'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            inputMode="numeric"
            value={confirm}
            onChange={(e) => setConfirm(onlyDigits(e.target.value))}
            placeholder="Confirm passcode"
            className={`${field} tracking-[0.4em]`}
          />
          {tooShort && <p className="text-[11px] text-danger">Use 4–8 digits.</p>}
          {mismatch && <p className="text-[11px] text-danger">Codes don’t match.</p>}
          <Button className="w-full justify-center gap-2" disabled={!valid} onClick={submit}>
            <Check size={16} /> {mode === 'set' ? 'Set passcode' : 'Update passcode'}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
