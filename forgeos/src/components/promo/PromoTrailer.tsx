// The ForgeOS trailer player: a 30-second, frame-exact motion piece drawn in
// the app's own Tempo look, with a synthesised soundtrack, ending on a real
// "Download ForgeOS now" button.
//
// Time is the single source of truth: `time` (seconds) drives every scene, the
// HUD and the score, so the player can pause, skip and replay without drift,
// and `capture` mode lets a script set the time frame by frame to render the
// same film into an MP4 (scripts/render-trailer.mjs).
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Pause, Play, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useT } from '../../lib/i18n';
import { CUE, DURATION, SKIP_TO, STAGE_H, STAGE_W, sceneById } from '../../lib/promo/schedule';
import { createLiveAudio, renderScoreWav, type LiveAudio } from '../../lib/promo/synth';
import { cameraStyle } from '../../lib/promo/transitions';
import { Ambient, Atmosphere, Hud, Overlays, SceneFrame, ScreenFx } from './Frame';
import { Hook, Logo } from './IntroScenes';
import { CoachScene, FoodScene, LevelScene, TrainScene } from './FeatureScenesA';
import { ProgressScene, RecoverScene, SocialScene, YoursScene } from './FeatureScenesB';
import { FinaleScene, WallScene } from './OutroScenes';
import { resetMeasurements, useChapterNames } from './kit';
import './promo.css';

export interface PromoTrailerProps {
  onDownload: () => void;
  onClose: () => void;
  /** Render-only: no controls, no clock; time is set through window.__forgeTrailer. */
  capture?: boolean;
  /** Fades instead of whips; no flashes, shake or glitches. */
  calm?: boolean;
  startAt?: number;
}

/** Stop redrawing the end card's ambient motion after this long. */
const IDLE_UNTIL = DURATION + 20;
/** The readiness ring's centre: the iris closes on it and reopens from it. */
const RING_CENTRE = '50% 51.25%';

const fitScale = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);

function useStageScale(): number {
  const [scale, setScale] = useState(fitScale);
  useEffect(() => {
    const on = () => setScale(fitScale());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

/** Waits for the trailer's typefaces (at most 1.5 s), so headlines are measured with the real font. */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => {
      if (!alive) return;
      resetMeasurements();
      setReady(true);
    };
    const fonts = document.fonts;
    if (!fonts?.load) {
      done();
      return;
    }
    const faces = ['700 64px "Saira Condensed"', '600 30px "Saira Condensed"', '500 13px "Saira"', '600 13px "Saira"', '700 13px "Saira"'];
    const timeout = new Promise((r) => window.setTimeout(r, 1500));
    void Promise.race([Promise.all(faces.map((f) => fonts.load(f))), timeout]).then(done, done);
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** A requestAnimationFrame clock that can pause, resume and jump. */
function useClock(startAt: number) {
  const [time, setTime] = useState(startAt);
  const [playing, setPlaying] = useState(false);
  const ref = useRef({ time: startAt, base: startAt, since: 0, playing: false });
  useEffect(() => {
    ref.current.playing = playing;
    if (!playing) return;
    ref.current.base = ref.current.time;
    ref.current.since = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = ref.current.base + (now - ref.current.since) / 1000;
      ref.current.time = t;
      setTime(t);
      if (t < IDLE_UNTIL) raf = requestAnimationFrame(loop);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  const seek = useCallback((t: number) => {
    ref.current.time = t;
    ref.current.base = t;
    ref.current.since = performance.now();
    setTime(t);
  }, []);
  const now = useCallback(() => ref.current.time, []);
  const isPlaying = useCallback(() => ref.current.playing, []);
  return { time, playing, setPlaying, seek, now, isPlaying };
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export default function PromoTrailer({ onDownload, onClose, capture = false, calm = false, startAt = 0 }: PromoTrailerProps) {
  const tr = useT();
  const names = useChapterNames();
  const scale = useStageScale();
  const ready = useFontsReady();
  const { time, playing, setPlaying, seek, now, isPlaying } = useClock(startAt);
  const audio = useRef<LiveAudio | null>(null);
  const soundOn = useRef(false);
  const [sound, setSound] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const focusedCta = useRef(false);

  // Start once the fonts are in; capture mode never runs its own clock.
  useEffect(() => {
    if (ready && !capture) setPlaying(true);
  }, [ready, capture, setPlaying]);

  const syncAudio = useCallback((play: boolean) => {
    const a = audio.current;
    if (!a) return;
    if (play && soundOn.current && now() < DURATION) a.start(now);
    else a.stop();
  }, [now]);

  const play = useCallback(() => {
    setPlaying(true);
    syncAudio(true);
  }, [setPlaying, syncAudio]);

  const pause = useCallback(() => {
    setPlaying(false);
    syncAudio(false);
  }, [setPlaying, syncAudio]);

  const jump = useCallback((t: number) => {
    seek(t);
    setPlaying(true);
    syncAudio(true);
  }, [seek, setPlaying, syncAudio]);

  // Created inside the tap itself: browsers only let sound start from a gesture.
  const toggleSound = useCallback(() => {
    if (soundOn.current) {
      soundOn.current = false;
      setSound(false);
      audio.current?.stop();
      return;
    }
    if (!audio.current) {
      try {
        audio.current = createLiveAudio();
      } catch {
        audio.current = null; // too many audio contexts on this device: stay silent
      }
    }
    if (!audio.current) return;
    soundOn.current = true;
    setSound(true);
    syncAudio(isPlaying());
  }, [isPlaying, syncAudio]);

  const leave = useCallback((next: () => void) => {
    audio.current?.close();
    audio.current = null;
    next();
  }, []);
  const download = useCallback(() => leave(onDownload), [leave, onDownload]);
  const close = useCallback(() => leave(onClose), [leave, onClose]);
  const skip = useCallback(() => {
    jump(SKIP_TO);
    rootRef.current?.focus({ preventScroll: true });
  }, [jump]);
  const replay = useCallback(() => {
    focusedCta.current = false;
    jump(0);
    rootRef.current?.focus({ preventScroll: true });
  }, [jump]);

  useEffect(() => () => audio.current?.close(), []);

  // A modal: the app underneath is unreachable while the trailer is up.
  useEffect(() => {
    if (capture) return;
    const app = document.getElementById('root');
    const before = document.activeElement as HTMLElement | null;
    app?.setAttribute('inert', '');
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      app?.removeAttribute('inert');
      before?.focus?.({ preventScroll: true });
    };
  }, [capture]);

  // Pause in a background tab; pick up where it was on return.
  useEffect(() => {
    if (capture) return;
    let resume = false;
    const onVis = () => {
      if (document.hidden) {
        resume = isPlaying() && now() < DURATION;
        if (resume) pause();
      } else if (resume) {
        resume = false;
        play();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [capture, isPlaying, now, pause, play]);

  // Keyboard: Escape skips (then closes), Space pauses, M toggles sound, Tab stays inside.
  useEffect(() => {
    if (capture) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
      if (e.repeat && e.key !== 'Tab') return;
      const onButton = (e.target as HTMLElement | null)?.tagName === 'BUTTON';
      if (e.key === 'Escape') {
        e.preventDefault();
        if (now() < SKIP_TO) skip();
        else close();
      } else if ((e.key === ' ' || e.key === 'k') && !onButton) {
        e.preventDefault();
        if (isPlaying()) pause();
        else play();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === 'Tab' && rootRef.current) {
        const items = [...rootRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === rootRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [capture, close, isPlaying, now, pause, play, skip, toggleSound]);

  // When the button appears, a keyboard user lands on it (unless they are on another control).
  useEffect(() => {
    if (capture || focusedCta.current || time < CUE.cta + 0.3) return;
    focusedCta.current = true;
    const active = document.activeElement;
    if (!active || active === document.body || active === rootRef.current) ctaRef.current?.focus({ preventScroll: true });
  }, [capture, time]);

  // Render-only hook for the MP4 export.
  useEffect(() => {
    if (!capture) return;
    const api = {
      duration: DURATION,
      ready: () => ready,
      seek: (t: number) =>
        new Promise<void>((resolve) => {
          flushSync(() => seek(t));
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
      audio: async () => toBase64(await renderScoreWav()),
    };
    const w = window as unknown as { __forgeTrailer?: typeof api };
    w.__forgeTrailer = api;
    return () => {
      delete w.__forgeTrailer;
    };
  }, [capture, ready, seek]);

  const ended = time >= DURATION;
  useEffect(() => {
    if (ended) audio.current?.stop();
  }, [ended]);
  const wide = window.innerWidth > STAGE_W * scale + 2;
  const progress = Math.min(1, time / DURATION);
  const enableFromStage = (e: React.MouseEvent) => {
    if (!soundOn.current && !capture && !(e.target as HTMLElement).closest('button')) toggleSound();
  };

  return (
    <div ref={rootRef} className="promo-root" role="dialog" aria-modal="true" aria-label={tr('ForgeOS trailer')} tabIndex={-1}>
      <Ambient time={time} />
      <p className="promo-sr">
        {tr('ForgeOS in 30 seconds. Log every set in one swipe, rank up with XP and streaks, scan meals for their macros, ask an AI trainer, race your friends live, check your Garmin readiness, watch your strength grow and make the app look your way. Free, no ads, no account needed.')}
      </p>
      <div className="promo-viewport" onClick={enableFromStage}>
        <div className="promo-stage" style={{ transform: `scale(${scale})` }}>
          {ready && (
            <>
              <div aria-hidden="true">
                <Atmosphere time={time} />
              </div>
              <div className="promo-abs" style={{ width: STAGE_W, height: STAGE_H, ...cameraStyle(time, calm) }}>
                <Scenes time={time} calm={calm} names={names} />
                <SceneFrame s={sceneById('finale')} time={time} calm={calm} opts={{ ownIn: true }} hidden={false}>
                  <FinaleScene time={time} calm={calm} capture={capture} onDownload={download} onClose={close} onReplay={replay} ctaRef={ctaRef} />
                </SceneFrame>
              </div>
              <div aria-hidden="true" style={{ pointerEvents: 'none' }}>
                <Overlays time={time} calm={calm} />
                <Hud time={time} names={names} />
              </div>
            </>
          )}
          {wide && <div className="promo-frame" />}
        </div>
      </div>
      {ready && <ScreenFx time={time} calm={calm} />}
      {!capture && (
        <div className="promo-controls">
          <div className="promo-progress" aria-hidden="true">
            <div style={{ transform: `scaleX(${progress})` }} />
          </div>
          <div className="promo-ctl-row">
            <button type="button" className="promo-ctl" aria-label={sound ? tr('Turn sound off') : tr('Turn sound on')} aria-pressed={sound} onClick={toggleSound}>
              {sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
            </button>
            {!ended && (
              <button type="button" className="promo-ctl" aria-label={playing ? tr('Pause') : tr('Play')} onClick={playing ? pause : play}>
                {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              </button>
            )}
            {time < SKIP_TO ? (
              <button type="button" className="promo-ctl" onClick={skip}>
                {tr('Skip')} <SkipForward size={16} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="promo-ctl" aria-label={tr('Close')} onClick={close}>
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
      {!capture && !sound && ready && time < 7 && (
        <button type="button" className="promo-hint" onClick={toggleSound}>
          <Volume2 size={16} aria-hidden="true" /> {tr('Tap for sound')}
        </button>
      )}
    </div>
  );
}

/** Every scene before the finale, each mounted only around its own window. */
function Scenes({ time, calm, names }: { time: number; calm: boolean; names: Partial<Record<string, string>> }) {
  const props = { time, calm, names };
  return (
    <>
      <SceneFrame s={sceneById('hook')} time={time} calm={calm} opts={{ ownOut: true }}>
        <Hook time={time} calm={calm} />
      </SceneFrame>
      <SceneFrame s={sceneById('logo')} time={time} calm={calm} opts={{ ownIn: true, ownOut: true }}>
        <Logo time={time} calm={calm} />
      </SceneFrame>
      <SceneFrame s={sceneById('train')} time={time} calm={calm} opts={{ ownIn: true }}>
        <TrainScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('level')} time={time} calm={calm}>
        <LevelScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('food')} time={time} calm={calm}>
        <FoodScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('coach')} time={time} calm={calm}>
        <CoachScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('social')} time={time} calm={calm}>
        <SocialScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('recover')} time={time} calm={calm} opts={{ iris: RING_CENTRE }}>
        <RecoverScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('progress')} time={time} calm={calm} opts={{ iris: RING_CENTRE }}>
        <ProgressScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('yours')} time={time} calm={calm}>
        <YoursScene {...props} />
      </SceneFrame>
      <SceneFrame s={sceneById('wall')} time={time} calm={calm} opts={{ ownOut: true }}>
        <WallScene time={time} calm={calm} />
      </SceneFrame>
    </>
  );
}
