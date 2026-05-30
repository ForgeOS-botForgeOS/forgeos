import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { MOCK_PLAYLISTS, MOCK_TRACKS, spotifyIsLive, getAuthUrl } from '../lib/spotify';
import { haptic } from '../lib/haptics';

export default function Spotify() {
  const navigate = useNavigate();
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const track = MOCK_TRACKS[trackIdx];

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm">
        <ChevronLeft size={16} /> Back
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Spotify</h1>
        {spotifyIsLive ? <Badge color="rgb(var(--success))">Connected</Badge> : <Badge color="rgb(var(--warn))">Mock</Badge>}
      </div>

      {!spotifyIsLive && (
        <Card className="text-sm text-muted">
          Playback is mocked. Register a Spotify Developer App, set the redirect URI, and add
          <code className="text-text"> VITE_SPOTIFY_CLIENT_ID</code> to go live.
          <Button variant="outline" className="w-full justify-center mt-3" onClick={() => window.open(getAuthUrl(), '_blank')}>
            Connect Spotify (OAuth)
          </Button>
        </Card>
      )}

      {/* Now playing */}
      <Card className="text-center py-6">
        <div className="mx-auto w-40 h-40 rounded-2xl bg-surface-2 flex items-center justify-center text-6xl mb-4">
          {track.albumArt}
        </div>
        <p className="font-bold text-lg">{track.title}</p>
        <p className="text-sm text-muted">{track.artist}</p>
        <div className="flex items-center justify-center gap-6 mt-5">
          <button onClick={() => setTrackIdx((i) => (i - 1 + MOCK_TRACKS.length) % MOCK_TRACKS.length)}><SkipBack /></button>
          <button
            onClick={() => { setPlaying((p) => !p); haptic('tap'); }}
            className="w-14 h-14 rounded-full bg-accent text-black flex items-center justify-center"
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button onClick={() => setTrackIdx((i) => (i + 1) % MOCK_TRACKS.length)}><SkipForward /></button>
        </div>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted uppercase mb-2">Playlists</h2>
        <div className="space-y-2">
          {MOCK_PLAYLISTS.map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center"><Music size={18} className="text-accent" /></div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-muted">{p.count} tracks · {p.vibe}</p>
              </div>
              <Play size={18} className="text-muted" />
            </Card>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted/70">Attach the now-playing track to a PR from the Quests → PR Hall of Fame screen.</p>
    </div>
  );
}
