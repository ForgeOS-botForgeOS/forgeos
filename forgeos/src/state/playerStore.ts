import { create } from 'zustand';
import { MOCK_TRACKS } from '../lib/spotify';

// App-wide music player state. One store drives both the full Spotify screen
// and the floating CD mini-player, so playback follows you across every screen.
// Playback is simulated (a progress clock that auto-advances) until a real
// Spotify Web Playback token is wired in; the UI is identical either way.
interface PlayerState {
  active: boolean; // the mini CD player is shown app-wide
  playing: boolean;
  index: number; // into MOCK_TRACKS
  progressMs: number;
  start: (i?: number) => void; // activate + play (optionally jump to a track)
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setIndex: (i: number) => void;
  dismiss: () => void; // turn the music off / hide the player
  setProgress: (ms: number) => void;
}

const wrap = (i: number) => (i + MOCK_TRACKS.length) % MOCK_TRACKS.length;

export const usePlayer = create<PlayerState>((set, get) => ({
  active: false,
  playing: false,
  index: 0,
  progressMs: 0,
  start: (i) => {
    const jump = i != null && i !== get().index;
    set({ active: true, playing: true, index: i ?? get().index, progressMs: jump ? 0 : get().progressMs });
  },
  toggle: () => set({ active: true, playing: !get().playing }),
  next: () => set({ index: wrap(get().index + 1), progressMs: 0, active: true, playing: true }),
  prev: () => set({ index: wrap(get().index - 1), progressMs: 0, active: true, playing: true }),
  setIndex: (i) => set({ index: wrap(i), progressMs: 0, active: true }),
  dismiss: () => set({ active: false, playing: false }),
  setProgress: (ms) => set({ progressMs: ms }),
}));
