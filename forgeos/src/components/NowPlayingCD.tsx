import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, X } from 'lucide-react';
import { usePlayer } from '../state/playerStore';
import { MOCK_TRACKS } from '../lib/spotify';
import { haptic } from '../lib/haptics';

// A floating "now playing" CD player that lives in the app shell, so music
// follows you across every screen. A spinning vinyl (paused when paused), the
// song + artist, transport controls, and an X to turn it off. Tap the title to
// open the full Spotify screen. Respects prefers-reduced-motion (the global
// rule freezes the spin).
export function NowPlayingCD() {
  const active = usePlayer((s) => s.active);
  const playing = usePlayer((s) => s.playing);
  const index = usePlayer((s) => s.index);
  const progressMs = usePlayer((s) => s.progressMs);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const dismiss = usePlayer((s) => s.dismiss);
  const setProgress = usePlayer((s) => s.setProgress);
  const navigate = useNavigate();

  // Simulated playback clock: advance ~1s at a time while playing, and roll to
  // the next track when the current one ends. Reads live state each tick so the
  // interval never fights a manual skip.
  useEffect(() => {
    if (!active || !playing) return;
    const id = window.setInterval(() => {
      const p = usePlayer.getState();
      const dur = MOCK_TRACKS[p.index].durationMs;
      if (p.progressMs + 1000 >= dur) p.next();
      else setProgress(p.progressMs + 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, playing, index, setProgress]);

  if (!active) return null;
  const track = MOCK_TRACKS[index];
  const pct = Math.min(100, (progressMs / track.durationMs) * 100);

  return (
    <div className="shrink-0 px-3 pb-1">
      <div className="relative overflow-hidden rounded-2xl bg-surface-2/95 border border-line backdrop-blur flex items-center gap-3 px-3 py-2 shadow-lg">
        {/* Spinning vinyl with the album look as the centre label */}
        <div
          className="relative w-11 h-11 rounded-full shrink-0"
          style={{
            background: 'repeating-radial-gradient(circle, #272727 0 1.5px, #0e0e0e 1.5px 3px)',
            animation: 'cd-spin 4s linear infinite',
            animationPlayState: playing ? 'running' : 'paused',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-5 h-5 rounded-full grid place-items-center text-[11px]" style={{ background: 'rgb(var(--accent))' }}>
              {track.albumArt}
            </div>
          </div>
        </div>

        {/* Song + artist — tap to open the full player */}
        <button onClick={() => navigate('/spotify')} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate">{track.title}</p>
          <p className="text-[11px] text-muted truncate">{track.artist}</p>
        </button>

        {/* Transport */}
        <button onClick={() => { toggle(); haptic('tap'); }} aria-label={playing ? 'Pause' : 'Play'} className="w-9 h-9 rounded-full bg-accent text-black grid place-items-center shrink-0 active:scale-90 transition">
          {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-[1px]" />}
        </button>
        <button onClick={() => { next(); haptic('tap'); }} aria-label="Next track" className="text-muted shrink-0 active:scale-90 transition"><SkipForward size={18} /></button>
        <button onClick={() => { dismiss(); haptic('tap'); }} aria-label="Turn music off" className="text-muted shrink-0 active:scale-90 transition"><X size={16} /></button>

        {/* Progress line */}
        <div className="absolute left-0 bottom-0 h-0.5 bg-accent" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />
      </div>
    </div>
  );
}
