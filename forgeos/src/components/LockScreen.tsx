import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Flame, Delete, Check } from 'lucide-react';
import { haptic } from '../lib/haptics';
import { PASSCODE_DOTS, PASSCODE_MAX, verifyPasscode } from '../lib/appLock';

// Local app-lock screen: shown on launch when a passcode is set. This is an
// app lock (privacy), not account authentication.
//
// `code` is the *stored secret* (a PBKDF2 hash), never the passcode — so this
// screen cannot know how long the passcode is, and deliberately does not show
// it: the old version drew one dot per digit, which told anyone glancing at the
// phone exactly how much to guess.
//
// Not knowing the length costs one thing, so the UI pays for it explicitly: the
// screen cannot tell when you have *finished* typing. It unlocks silently the
// moment the digits match (so a 4-digit code still needs no extra tap), and
// there is an Unlock button for everything else. Without that button a single
// mistyped digit would sit in the entry until you happened to reach 8 — and the
// next, correct code would fail through no fault of the person typing it.
export function LockScreen({ code, onUnlock }: { code: string; onUnlock: (entered: string) => void }) {
  const [entry, setEntry] = useState('');
  const [shake, setShake] = useState(false);
  const [waitMs, setWaitMs] = useState(0);
  const wrong = useRef(0);
  const busy = useRef(false);

  /** Try `candidate`; `explicit` = the user pressed Unlock, so failing counts. */
  async function attempt(candidate: string, explicit: boolean): Promise<void> {
    if (candidate.length < PASSCODE_DOTS || busy.current) return;
    busy.current = true;
    const ok = await verifyPasscode(candidate, code);
    busy.current = false;
    if (ok) {
      wrong.current = 0;
      haptic('success');
      onUnlock(candidate);
      return;
    }
    // A silent auto-check that misses is not a failed attempt — the passcode
    // may simply be longer than what has been typed so far.
    if (!explicit && candidate.length < PASSCODE_MAX) return;

    wrong.current += 1;
    setEntry('');
    setShake(true);
    haptic('warning');
    // Back off after repeated wrong codes so the keypad cannot be brute-forced
    // by hand (a 4-digit space is only 10,000 tries otherwise).
    if (wrong.current >= 5) {
      const penalty = Math.min(30_000, 2_000 * 2 ** (wrong.current - 5));
      setWaitMs(penalty);
      setTimeout(() => setWaitMs(0), penalty);
    }
    setTimeout(() => setShake(false), 450);
  }

  async function press(d: string) {
    if (waitMs > 0) return;
    haptic('tap');
    const next = (entry + d).slice(0, PASSCODE_MAX);
    setEntry(next);
    await attempt(next, false);
  }

  return (
    <div className="absolute inset-0 z-[95] flex flex-col items-center justify-center bg-bg p-8">
      <Flame className="text-accent mb-2" size={32} />
      <div className="flex items-center gap-2 text-muted mb-6">
        <Lock size={14} /> <span className="text-sm">{waitMs > 0 ? `Too many tries — wait ${Math.ceil(waitMs / 1000)}s` : 'Enter your passcode'}</span>
      </div>
      <motion.div animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} className="flex gap-3 mb-8">
        {Array.from({ length: Math.max(PASSCODE_DOTS, entry.length) }).map((_, i) => (
          <span key={i} className={`w-3.5 h-3.5 rounded-full border-2 ${i < entry.length ? 'bg-accent border-accent' : 'border-line'}`} />
        ))}
      </motion.div>
      <div className="grid grid-cols-3 gap-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => void press(d)} className="w-16 h-16 rounded-full bg-surface-2 text-2xl font-mono active:scale-90 transition">{d}</button>
        ))}
        <span />
        <button onClick={() => void press('0')} className="w-16 h-16 rounded-full bg-surface-2 text-2xl font-mono active:scale-90 transition">0</button>
        <button onClick={() => setEntry(entry.slice(0, -1))} aria-label="Delete a digit" className="w-16 h-16 rounded-full flex items-center justify-center text-muted active:scale-90 transition"><Delete size={22} /></button>
      </div>
      <div className="h-16 mt-4 flex items-center">
        {entry.length >= PASSCODE_DOTS && waitMs === 0 && (
          <button
            onClick={() => void attempt(entry, true)}
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-black active:scale-95 transition"
          >
            <Check size={18} /> Unlock
          </button>
        )}
      </div>
    </div>
  );
}
