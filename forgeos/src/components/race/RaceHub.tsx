import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Timer, Weight, Dumbbell, Share2, Flag, Circle } from 'lucide-react';
import { Card, Button, Pill, Badge, SectionTitle } from '../ui';
import { useRace, type ActiveRace } from '../../state/raceStore';
import { useWorkout } from '../../state/workoutStore';
import {
  progressFraction, raceRuleText, shareRaceInvite,
  TIMED_DURATIONS_MIN, VOLUME_TARGETS_KG, type RaceMode,
} from '../../lib/race';
import { createRace, ensureRaceSession, leaveRace, startRace } from '../../lib/raceSession';
import { haptic } from '../../lib/haptics';
import { toast } from '../../lib/toast';
import { useT } from '../../lib/i18n';

// The real multiplayer race (Supabase Realtime). Rendered in Social's Race tab
// when the backend is live; the offline demo (LiveRace) covers mock mode.
export function RaceHub() {
  const active = useRace((s) => s.active);
  useEffect(() => ensureRaceSession(), []);
  return active ? <RaceStatus active={active} /> : <RaceCreate />;
}

const MODES: { mode: RaceMode; icon: typeof Swords; titleKey: string; subKey: string }[] = [
  { mode: 'workout', icon: Dumbbell, titleKey: 's.raceModeWorkout', subKey: 's.raceModeWorkoutSub' },
  { mode: 'volume', icon: Weight, titleKey: 's.raceModeVolume', subKey: 's.raceModeVolumeSub' },
  { mode: 'timed', icon: Timer, titleKey: 's.raceModeTimed', subKey: 's.raceModeTimedSub' },
];

function RaceCreate() {
  const t = useT();
  const [mode, setMode] = useState<RaceMode>('workout');
  const [targetKg, setTargetKg] = useState(8000);
  const [durationMin, setDurationMin] = useState(30);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const history = useWorkout((s) => s.history);
  const raceable = history.filter((w) => !w.cardio && w.exercises.length > 0).slice(0, 5);

  function create() {
    haptic('tap');
    const workout = raceable.find((w) => w.id === workoutId) ?? raceable[0];
    const config = createRace(mode, { targetKg, durationMin, workout: mode === 'workout' ? workout : undefined });
    if (!config) {
      toast(mode === 'workout' ? t('s.raceNoHistory') : 'Could not create the race — are you online?', 'error');
      return;
    }
    void shareRaceInvite(config).then((how) => toast(how === 'copied' ? 'Invite link copied — send it to a friend 🏁' : 'Invite sent 🏁', 'success'));
  }

  return (
    <Card className="space-y-3">
      <div className="text-center space-y-1">
        <Swords className="mx-auto text-accent" />
        <p className="font-semibold">{t('s.race')}</p>
        <p className="text-sm text-muted">{t('s.racePickMode')}</p>
      </div>

      <div className="space-y-1.5">
        {MODES.map(({ mode: m, icon: Icon, titleKey, subKey }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ${mode === m ? 'bg-accent/15 ring-1 ring-accent' : 'bg-surface-2'}`}
          >
            <Icon size={18} className={mode === m ? 'text-accent' : 'text-muted'} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{t(titleKey)}</p>
              <p className="text-[11px] text-muted">{t(subKey)}</p>
            </div>
          </button>
        ))}
      </div>

      {mode === 'workout' && (
        raceable.length === 0
          ? <p className="text-sm text-muted">{t('s.raceNoHistory')}</p>
          : (
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-muted">{t('s.racePickWorkout')}</p>
              {raceable.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWorkoutId(w.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${(workoutId ?? raceable[0].id) === w.id ? 'bg-accent/15 ring-1 ring-accent' : 'bg-surface-2'}`}
                >
                  <span className="font-semibold truncate">{w.name}</span>
                  <span className="text-[11px] text-muted shrink-0 ml-2">{w.exercises.reduce((n, e) => n + e.sets.length, 0)} {t('common.sets')}</span>
                </button>
              ))}
            </div>
          )
      )}
      {mode === 'volume' && (
        <div className="flex gap-2 flex-wrap">
          {VOLUME_TARGETS_KG.map((kg) => (
            <Pill key={kg} active={targetKg === kg} onClick={() => setTargetKg(kg)}>{kg.toLocaleString()} kg</Pill>
          ))}
        </div>
      )}
      {mode === 'timed' && (
        <div className="flex gap-2 flex-wrap">
          {TIMED_DURATIONS_MIN.map((min) => (
            <Pill key={min} active={durationMin === min} onClick={() => setDurationMin(min)}>{min} min</Pill>
          ))}
        </div>
      )}

      <Button className="w-full justify-center" onClick={create} disabled={mode === 'workout' && raceable.length === 0}>
        <Flag size={16} className="mr-1" /> {t('s.raceCreate')}
      </Button>
    </Card>
  );
}

function RaceStatus({ active }: { active: ActiveRace }) {
  const t = useT();
  const navigate = useNavigate();
  const { config, status, role, winnerId } = active;
  const racers = Object.values(active.racers);
  const leaderVolume = Math.max(0, ...racers.map((r) => r.volumeKg));
  const sorted = [...racers].sort((a, b) => progressFraction(config, b, leaderVolume) - progressFraction(config, a, leaderVolume));

  // The moment the host starts the race everyone jumps into the live session.
  useEffect(() => {
    if (status === 'racing') navigate('/train');
  }, [status, navigate]);

  return (
    <Card className="space-y-3">
      <SectionTitle
        action={
          status === 'done'
            ? <Badge color="rgb(var(--success))">🏁 {t('s.raceWinner')}: {racers.find((r) => r.userId === winnerId)?.name ?? '?'}</Badge>
            : <button onClick={() => leaveRace()} className="text-xs text-muted">{t('s.raceLeave')}</button>
        }
      >
        {status === 'lobby' ? t('s.raceLobby') : t('s.raceInProgress')}
      </SectionTitle>
      <p className="text-sm text-muted">{raceRuleText(config)}</p>

      <div className="space-y-1.5">
        {sorted.map((r) => (
          <div key={r.userId} className="py-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-semibold">
                {r.name}
                <Circle size={7} className={r.online ? 'fill-success text-success' : 'fill-muted text-muted'} />
                {!r.online && <span className="text-[10px] text-muted">{t('s.raceOffline')}</span>}
              </span>
              <span className="font-mono text-xs">
                {config.mode === 'workout' ? `${r.completedSets}/${config.totalSets} ${t('common.sets')}` : `${Math.round(r.volumeKg).toLocaleString()} kg`}
              </span>
            </div>
            {status !== 'lobby' && (
              <div className="h-1.5 mt-1 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progressFraction(config, r, leaderVolume) * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {status === 'lobby' && (
        <div className="space-y-2">
          <Button variant="ghost" className="w-full justify-center" onClick={() => void shareRaceInvite(config).then((how) => toast(how === 'copied' ? 'Invite link copied 🏁' : 'Invite sent 🏁', 'success'))}>
            <Share2 size={16} className="mr-1" /> {t('s.raceInvite')}
          </Button>
          {role === 'host'
            ? <Button className="w-full justify-center" onClick={() => startRace()}><Flag size={16} className="mr-1" /> {t('s.raceStart')}</Button>
            : active.racers[config.hostId]?.online
              ? <p className="text-center text-sm text-muted">{t('s.raceWaitingHost')}</p>
              : <p className="text-center text-sm text-muted">{t('s.raceHostGone')}</p>}
        </div>
      )}
      {status === 'racing' && (
        <Button className="w-full justify-center" onClick={() => navigate('/train')}>{t('s.raceOpenTrain')}</Button>
      )}
      {status === 'done' && (
        <Button className="w-full justify-center" onClick={() => leaveRace()}>{t('common.finish')}</Button>
      )}
    </Card>
  );
}
