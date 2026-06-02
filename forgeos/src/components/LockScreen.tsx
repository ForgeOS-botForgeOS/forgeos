import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Flame, Delete } from 'lucide-react';
import { haptic } from '../lib/haptics';

// Local app-lock screen: shown on launch when a passcode is set. This is an
// app lock (privacy), not account authentication.
export function LockScreen({ code, onUnlock }: { code: string; onUnlock: () => void }) {
  const [entry, setEntry] = useState('');
  const [shake, setShake] = useState(false);

  function press(d: string) {
    haptic('tap');
    const next = (entry + d).slice(0, 8);
    setEntry(next);
    if (next.length >= code.length && next === code) {
      haptic('success');
      onUnlock();
    } else if (next.length >= code.length) {
      setShake(true);
      haptic('warning');
      setTimeout(() => { setShake(false); setEntry(''); }, 450);
    }
  }

  return (
    <div className="absolute inset-0 z-[95] flex flex-col items-center justify-center bg-bg p-8">
      <Flame className="text-accent mb-2" size={32} />
      <div className="flex items-center gap-2 text-muted mb-6"><Lock size={14} /> <span className="text-sm">Enter your passcode</span></div>
      <motion.div animate={shake ? { x: [-8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} className="flex gap-3 mb-8">
        {Array.from({ length: Math.max(4, code.length) }).map((_, i) => (
          <span key={i} className={`w-3.5 h-3.5 rounded-full border-2 ${i < entry.length ? 'bg-accent border-accent' : 'border-line'}`} />
        ))}
      </motion.div>
      <div className="grid grid-cols-3 gap-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => press(d)} className="w-16 h-16 rounded-full bg-surface-2 text-2xl font-mono active:scale-90 transition">{d}</button>
        ))}
        <span />
        <button onClick={() => press('0')} className="w-16 h-16 rounded-full bg-surface-2 text-2xl font-mono active:scale-90 transition">0</button>
        <button onClick={() => setEntry(entry.slice(0, -1))} className="w-16 h-16 rounded-full flex items-center justify-center text-muted active:scale-90 transition"><Delete size={22} /></button>
      </div>
    </div>
  );
}
