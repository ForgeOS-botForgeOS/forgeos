import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { listen, sttSupported, type Dictation } from '../lib/speech';
import { haptic } from '../lib/haptics';

// A mic button that dictates speech into text. Calls onText once with the final
// transcript when you stop / it settles. Renders nothing where the browser has
// no speech recognition (older webviews, iOS Safari), so callers can drop it in
// freely alongside a normal text field.
export function VoiceDictate({ onText, label = 'Speak', className = '' }: { onText: (text: string) => void; label?: string; className?: string }) {
  const [listening, setListening] = useState(false);
  const dictation = useRef<Dictation | null>(null);
  if (!sttSupported) return null;

  function toggle() {
    if (listening) { dictation.current?.stop(); return; }
    haptic('tap');
    let last = '';
    let emitted = false;
    dictation.current = listen({
      onText: (t, final) => { last = t; if (final && t.trim()) { emitted = true; onText(t.trim()); } },
      onEnd: () => { setListening(false); if (!emitted && last.trim()) onText(last.trim()); },
      onError: () => setListening(false),
    });
    if (dictation.current) { dictation.current.start(); setListening(true); }
    else setListening(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? 'Stop dictation' : 'Dictate with your voice'}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${listening ? 'bg-accent text-black animate-pulse' : 'bg-surface-2 text-muted'} ${className}`}
    >
      {listening ? <Square size={14} /> : <Mic size={16} />}
      {listening ? 'Listening…' : label}
    </button>
  );
}
