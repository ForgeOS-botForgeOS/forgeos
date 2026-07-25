import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Play, TrendingUp, Trophy, Music2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, Badge, Button, SectionTitle } from '../components/ui';
import { exerciseById, substitutesFor } from '../data/exercises';
import { cuesFor } from '../data/cues';
import { MUSCLE_CUES } from '../data/tips';
import { liftBadge } from '../data/ranks';
import { useWorkout } from '../state/workoutStore';
import { useUser } from '../state/userStore';
import { liftProgression, liftStats, type LiftSession } from '../lib/exerciseStats';
import { warmupSets } from '../lib/fitness';
import { useT, useLocale } from '../lib/i18n';

/**
 * One movement, everything about it: how to do it, and what *you* have done with
 * it — sessions, best set, PR, e1RM progression and the full log. Reachable by
 * tapping a lift anywhere (live session, library, history, PR Hall).
 */
export default function ExerciseDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const locale = useLocale();
  const history = useWorkout((s) => s.history);
  const prs = useWorkout((s) => s.prs);
  const bodyweight = useUser((s) => s.profile?.weightKg ?? 80);

  const ex = exerciseById(id);
  const stats = useMemo(() => liftStats(history, prs, id), [history, prs, id]);
  const series = useMemo(() => liftProgression(stats), [stats]);
  const alts = useMemo(() => substitutesFor(id).slice(0, 6), [id]);

  if (!ex) {
    return (
      <div className="px-4 pt-12 pb-6 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>
        <p className="text-sm text-muted">{t('ex.notFound')}</p>
      </div>
    );
  }

  const cues = cuesFor(ex);
  const working = stats.bestSet?.weightKg ?? 60;
  const badge = stats.bestE1rm > 0 ? liftBadge(Math.round(stats.bestE1rm), bodyweight) : null;
  // Cardio logs carry minutes, not load — e1RM, tonnage and warm-up ladders are
  // meaningless there, so those blocks only exist for loaded movements.
  const isLoaded = ex.category !== 'Cardio';

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold leading-tight">{ex.name}</h1>
          {badge && <Badge color={badge.color}>{badge.name}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge color="rgb(var(--accent-2))">{ex.category}</Badge>
          <Badge>{ex.primary}</Badge>
          {ex.secondary.map((m) => <Badge key={m} color="rgb(var(--muted))">{m}</Badge>)}
          {ex.isCore && <Badge color="rgb(var(--success))">core</Badge>}
        </div>
        <p className="text-sm text-muted">{t('ex.equipment')}: {ex.equipment}</p>
      </header>

      {/* ---- your numbers ---- */}
      <Card className="space-y-3">
        <SectionTitle
          action={stats.trendPct != null && stats.trendPct !== 0 ? (
            <span className={`flex items-center gap-1 text-xs font-bold ${stats.trendPct > 0 ? 'text-success' : 'text-warn'}`}>
              <TrendingUp size={13} className={stats.trendPct > 0 ? '' : 'rotate-180'} />
              {stats.trendPct > 0 ? '+' : ''}{stats.trendPct}%
            </span>
          ) : undefined}
        >
          {t('ex.yourNumbers')}
        </SectionTitle>
        {stats.sessionCount === 0 ? (
          <p className="text-sm text-muted">{t('ex.noHistory')}</p>
        ) : (
          <div className={`grid gap-2 text-center ${isLoaded ? 'grid-cols-4' : 'grid-cols-2'}`}>
            <Metric v={String(stats.sessionCount)} label={t('ex.sessions')} />
            {isLoaded && <Metric v={String(Math.round(stats.bestE1rm))} label={t('ex.bestE1rm')} />}
            <Metric v={String(stats.totalSets)} label={t('common.sets')} />
            {isLoaded && <Metric v={volumeLabel(stats.totalVolumeKg)} label={t('ex.volume')} />}
          </div>
        )}
        {isLoaded && stats.bestSet && (
          <p className="text-xs text-muted">
            {t('ex.bestSet')}: <b className="font-mono text-text">{stats.bestSet.weightKg}kg × {stats.bestSet.reps}</b>
            {stats.bestSetDate && ` · ${new Date(stats.bestSetDate).toLocaleDateString(locale)}`}
          </p>
        )}
      </Card>

      {/* ---- the recorded PR ---- */}
      {isLoaded && stats.pr && (
        <Card className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-accent-2"><Trophy size={13} /> {t('ex.pr')}</p>
            <span className="text-[11px] text-muted">{new Date(stats.pr.date).toLocaleDateString(locale)}</span>
          </div>
          <p className="font-mono text-2xl font-extrabold">{stats.pr.weightKg}kg × {stats.pr.reps}</p>
          <p className="text-xs text-muted">e1RM {Math.round(stats.pr.e1rm)} kg</p>
          {stats.pr.spotifyTrack && (
            <p className="flex items-center gap-1.5 pt-1 text-[11px] text-accent">
              <Music2 size={11} /> {stats.pr.spotifyTrack.title} — {stats.pr.spotifyTrack.artist}
            </p>
          )}
        </Card>
      )}

      {/* ---- progression ---- */}
      {isLoaded && series.length > 1 && (
        <Card>
          <SectionTitle>{t('ex.progression')}</SectionTitle>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ left: -22, right: 6, top: 6 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} interval="preserveStartEnd" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} />
                <Tooltip contentStyle={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v} kg`, 'e1RM']} />
                <Line type="monotone" dataKey="e1rm" stroke="rgb(var(--accent))" strokeWidth={2.5} dot={{ r: 2.5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted">
            {series[0].e1rm} → {series[series.length - 1].e1rm} kg · {series.length} {t('ex.sessions')}
          </p>
        </Card>
      )}

      {/* ---- how to do it ---- */}
      <Card className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-accent-2">{t('ex.howTo')}</p>
          <Badge color="rgb(var(--muted))">{cues.pattern}</Badge>
        </div>
        <ol className="space-y-1.5">
          {cues.steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs"><span className="text-accent">🫁 {t('ex.breathing')}.</span> {cues.breathing}</p>
        <p className="text-xs"><span className="text-warn">⚠️ {t('ex.mistake')}.</span> {cues.mistake}</p>
        <p className="border-t border-line pt-2 text-xs text-muted">
          <span className="text-accent-2">🎯 {ex.primary}.</span> {MUSCLE_CUES[ex.primary] ?? 'Control the weight through a full range of motion.'}
        </p>
      </Card>

      {/* ---- warm-up ladder ---- */}
      {isLoaded && (
      <Card>
        <SectionTitle>{t('ex.warmup')} {working}kg</SectionTitle>
        <div className="flex gap-2">
          {warmupSets(working).map((s) => (
            <span key={s.pct} className="flex-1 rounded-lg bg-surface-2 py-2 text-center text-xs">
              <b className="font-mono">{s.kg}</b><span className="text-muted"> · {s.pct}%</span>
            </span>
          ))}
        </div>
      </Card>
      )}

      {/* ---- every session with this lift ---- */}
      {stats.sessions.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>{t('ex.log')}</SectionTitle>
          {stats.sessions.slice(0, 12).map((s) => (
            <SessionRow key={s.workoutId} session={s} locale={locale} onOpen={() => navigate(`/workout/${s.workoutId}`)} />
          ))}
        </div>
      )}

      {/* ---- swap it ---- */}
      {alts.length > 0 && (
        <div className="space-y-2">
          <SectionTitle>{t('ex.similar')}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {alts.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/exercise/${a.id}`)}
                className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs text-muted"
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {ex.videoUrl && (
        <Button variant="outline" className="w-full justify-center" onClick={() => window.open(ex.videoUrl, '_blank', 'noopener,noreferrer')}>
          <span className="flex items-center gap-2"><Play size={16} /> {t('ex.video')}</span>
        </Button>
      )}
    </div>
  );
}

/** Tonnes once it's worth reading as tonnes, kilos while it isn't. */
function volumeLabel(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
}

function Metric({ v, label }: { v: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-lg font-bold leading-none">{v}</p>
      <p className="mt-1 text-[10px] text-muted">{label}</p>
    </div>
  );
}

function SessionRow({ session, locale, onOpen }: { session: LiftSession; locale: string; onOpen: () => void }) {
  return (
    <Card onClick={onOpen} className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs text-muted">{new Date(session.date).toLocaleDateString(locale)}</p>
        <p className="truncate font-mono text-sm">
          {session.sets.map((s) => `${s.weightKg}×${s.reps}`).join(' · ')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-xs text-accent">{Math.round(session.bestE1rm)}</span>
        <ChevronRight size={14} className="text-muted" />
      </div>
    </Card>
  );
}
