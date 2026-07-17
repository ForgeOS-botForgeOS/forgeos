import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Swords, Dumbbell, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { decodeRaceInvite, raceRuleText } from '../lib/race';
import { joinRaceFromInvite } from '../lib/raceSession';
import { isBackendLive } from '../lib/supabase';
import { useWorkout } from '../state/workoutStore';
import { exerciseById } from '../data/exercises';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';
import { useT } from '../lib/i18n';

// Opened from a race invite link (#/race-join?d=...). Shows the rules, then
// joins the realtime lobby — the workout itself starts when the host starts.
export default function RaceJoin() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const active = useWorkout((s) => s.active);
  const [done, setDone] = useState(false);

  const code = params.get('d') ?? '';
  const config = useMemo(() => (code ? decodeRaceInvite(code) : null), [code]);

  function join() {
    if (!config) return;
    if (config.mode === 'workout' && active && !confirm('You have a workout in progress — the race will replace it when it starts. Join anyway?')) return;
    if (!joinRaceFromInvite(config)) {
      toast('Live races need an internet connection.', 'error');
      return;
    }
    setDone(true);
    haptic('success');
    setTimeout(() => navigate('/social?tab=race'), 700);
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Home</button>
      <h1 className="text-2xl font-extrabold">{t('s.race')} 🏁</h1>

      {!config ? (
        <Card><p className="text-sm text-muted">This race link is invalid or has expired.</p></Card>
      ) : done ? (
        <Card className="flex items-center gap-3"><CheckCircle2 className="text-success" /><p className="text-sm">You're in! Opening the lobby…</p></Card>
      ) : (
        <>
          <Card className="space-y-2">
            <p className="font-semibold flex items-center gap-2"><Swords size={16} className="text-accent" /> {config.hostName} challenged you to a live race</p>
            <p className="text-sm text-muted">{raceRuleText(config)}</p>
          </Card>

          {config.mode === 'workout' && config.workout && config.workout.exercises.map((e, i) => (
            <Card key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm flex items-center gap-2"><Dumbbell size={14} className="text-accent" /> {exerciseById(e.exerciseId)?.name ?? 'Exercise'}</p>
                <Badge>{e.sets.length} {t('common.sets')}</Badge>
              </div>
              <p className="text-xs text-muted">{e.sets.map((s) => `${s.weightKg}kg×${s.reps}`).join(' · ')}</p>
            </Card>
          ))}

          {!isBackendLive && <Card><p className="text-sm text-muted">Racing needs the online backend — this build runs in offline demo mode.</p></Card>}
          <Button className="w-full justify-center" onClick={join} disabled={!isBackendLive}>
            <span className="flex items-center gap-2"><Swords size={16} /> {t('s.raceJoin')}</span>
          </Button>
          <p className="text-[11px] text-muted/70">You'll land in the lobby — the workout starts for everyone when the host hits Start.</p>
        </>
      )}
    </div>
  );
}
