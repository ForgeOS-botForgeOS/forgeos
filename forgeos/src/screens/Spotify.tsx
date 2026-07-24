import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { MOCK_PLAYLISTS, MOCK_TRACKS, spotifyIsLive, spotifyConnected, spotifyRedirectUri, beginSpotifyAuth, spotifyLogout } from '../lib/spotify';
import { usePlayer } from '../state/playerStore';
import { haptic } from '../lib/haptics';

export default function Spotify() {
  const navigate = useNavigate();
  const active = usePlayer((s) => s.active);
  const playing = usePlayer((s) => s.playing);
  const index = usePlayer((s) => s.index);
  const start = usePlayer((s) => s.start);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const track = MOCK_TRACKS[index];
  const isPlaying = active && playing;
  const connected = spotifyConnected();

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm">
        <ChevronLeft size={16} /> Back
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Spotify</h1>
        {connected ? <Badge color="rgb(var(--success))">Connected</Badge> : spotifyIsLive ? <Badge color="rgb(var(--warn))">Not logged in</Badge> : <Badge color="rgb(var(--warn))">Setup needed</Badge>}
      </div>

      {!connected && spotifyIsLive && (
        <Card className="text-sm text-muted">
          Log in to link your real Spotify account.
          <Button className="w-full justify-center mt-3" onClick={() => void beginSpotifyAuth()}>
            Log in with Spotify
          </Button>
        </Card>
      )}

      {!spotifyIsLive && (
        <Card className="text-sm text-muted space-y-2">
          <p className="font-semibold text-text">Connect Spotify — 2-minute setup</p>
          <p>Logging in needs a free Spotify app registered to your account — that’s the piece that was missing, so the login had nothing to connect to.</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Open <span className="text-text">developer.spotify.com/dashboard</span> → <b>Create app</b>.</li>
            <li>Add this <b>Redirect URI</b> exactly: <code className="text-accent break-all">{spotifyRedirectUri}</code></li>
            <li>Copy the <b>Client ID</b> and add it as a build secret <code className="text-text">VITE_SPOTIFY_CLIENT_ID</code> — or send it to me and I’ll wire it in.</li>
          </ol>
          <p className="text-[11px] text-muted/70">Until then the player runs in demo mode (the disc spins and tracks advance, but there’s no real audio — real playback also needs Spotify Premium).</p>
        </Card>
      )}

      {connected && (
        <Button variant="ghost" className="w-full justify-center" onClick={() => { spotifyLogout(); window.location.reload(); }}>
          Log out of Spotify
        </Button>
      )}

      {/* Now playing — a big spinning vinyl */}
      <Card className="text-center py-6">
        <div
          className="mx-auto w-44 h-44 rounded-full relative mb-5"
          style={{
            background: 'repeating-radial-gradient(circle, #272727 0 3px, #0e0e0e 3px 6px)',
            animation: 'cd-spin 5s linear infinite',
            animationPlayState: isPlaying ? 'running' : 'paused',
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05), 0 12px 30px -12px rgba(0,0,0,0.7)',
          }}
        >
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-16 h-16 rounded-full grid place-items-center text-4xl" style={{ background: 'rgb(var(--accent))' }}>
              {track.albumArt}
            </div>
          </div>
          {/* centre spindle hole */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-bg border border-line" />
          </div>
        </div>
        <p className="font-bold text-lg">{track.title}</p>
        <p className="text-sm text-muted">{track.artist}</p>
        <div className="flex items-center justify-center gap-6 mt-5">
          <button onClick={() => { prev(); haptic('tap'); }} aria-label="Previous"><SkipBack /></button>
          <button
            onClick={() => { if (!active) start(index); else toggle(); haptic('tap'); }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-14 h-14 rounded-full bg-accent text-black flex items-center justify-center"
          >
            {isPlaying ? <Pause /> : <Play className="translate-x-[1px]" />}
          </button>
          <button onClick={() => { next(); haptic('tap'); }} aria-label="Next"><SkipForward /></button>
        </div>
        <p className="text-[11px] text-muted/70 mt-4">Plays across all of ForgeOS — control it from the mini player on any screen.</p>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted uppercase mb-2">Playlists</h2>
        <div className="space-y-2">
          {MOCK_PLAYLISTS.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 cursor-pointer" onClick={() => { start(0); haptic('tap'); }}>
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
