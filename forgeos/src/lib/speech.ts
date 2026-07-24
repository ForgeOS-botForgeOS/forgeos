// Voice helpers over the Web Speech API: text-to-speech (announce sets) and
// speech-to-text (dictate a plan). Both degrade gracefully where unsupported
// (older webviews, iOS Safari recognition) — callers check *Supported first.

export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, opts: { rate?: number; pitch?: number } = {}): void {
  if (!ttsSupported || !text.trim()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 1.05;
    u.pitch = opts.pitch ?? 1;
    u.lang = 'en-US';
    window.speechSynthesis.cancel(); // don't let cues stack up
    window.speechSynthesis.speak(u);
  } catch {
    /* speech unavailable — silent */
  }
}

export function cancelSpeech(): void {
  if (ttsSupported) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

// Turn "Bench Press", 60, 8 into a spoken cue like "Bench Press, 60 kilos, 8 reps".
export function setCue(exercise: string, weightKg: number, reps: number): string {
  const w = weightKg > 0 ? `, ${weightKg} kilo${weightKg === 1 ? '' : 's'}` : ' bodyweight';
  return `${exercise}${w}, ${reps} rep${reps === 1 ? '' : 's'}`;
}

/* ---------------------- Speech recognition (dictation) ---------------------- */

interface RecognitionAlt { transcript: string }
interface RecognitionResult { readonly length: number; isFinal: boolean; 0: RecognitionAlt }
interface RecognitionResultList { readonly length: number; [i: number]: RecognitionResult }
interface RecognitionEvent { resultIndex: number; results: RecognitionResultList }
interface RecognitionErrorEvent { error?: string }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const sttSupported = recognitionCtor() !== null;

export interface Dictation { start: () => void; stop: () => void }

// Start listening; onText fires with the running transcript (final=true when the
// phrase is settled). Returns null if recognition isn't available.
export function listen(handlers: {
  onText: (text: string, final: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}): Dictation | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = 'en-US';
  r.interimResults = true;
  r.continuous = false;
  r.onresult = (e) => {
    let text = '';
    let final = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) final = true;
    }
    handlers.onText(text, final);
  };
  r.onerror = (e) => handlers.onError?.(e.error ?? 'error');
  r.onend = () => handlers.onEnd?.();
  return {
    start: () => { try { r.start(); } catch { /* already started */ } },
    stop: () => { try { r.stop(); } catch { /* not running */ } },
  };
}
