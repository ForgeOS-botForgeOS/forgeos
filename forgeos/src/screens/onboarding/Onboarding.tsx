import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Globe, Loader2, Check } from 'lucide-react';
import { Button, Card, Pill, Sheet, Toggle } from '../../components/ui';
import { ForgeLogo } from '../../components/ForgeLogo';
import { InstallButton } from '../../components/InstallButton';
import { isBackendLive, signInWithEmail, signUpWithEmail } from '../../lib/supabase';
import { ICE_BREAKER } from '../../data/quests';
import { useUser } from '../../state/userStore';
import { macrosFor, mifflinStJeor, tdee, bodyFatBand } from '../../lib/fitness';
import { signInWithGoogle, googleIsLive } from '../../lib/googleAuth';
import { useT } from '../../lib/i18n';
import { haptic } from '../../lib/haptics';
import type { ActivityLevel, ExperienceLevel, Goal, Sex, UserProfile } from '../../types';
import { buildWeekPlan } from './planGenerator';
import { FitnessTest } from './FitnessTest';

type Step = 'signin' | 'quiz' | 'metrics' | 'test' | 'plan';

export default function Onboarding() {
  const t = useT();
  const [step, setStep] = useState<Step>('signin');
  const [provider, setProvider] = useState<UserProfile['authProvider']>('guest');
  const [googleEmail, setGoogleEmail] = useState<string | undefined>(undefined);
  const [quiz, setQuiz] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState(28);
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(80);
  const [goal, setGoal] = useState<Goal>('recomp');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [fitnessScore, setFitnessScore] = useState(0.5);
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [signingIn, setSigningIn] = useState<null | 'google'>(null);
  const [signInErr, setSignInErr] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [noWeekends, setNoWeekends] = useState(false);
  const [specialRequest, setSpecialRequest] = useState('');

  function emailContinue() {
    if (!isBackendLive) {
      // No backend yet — proceed in demo mode.
      setProvider('email');
      setStep('quiz');
      return;
    }
    setEmailOpen(true);
  }

  async function continueWithGoogle() {
    setSignInErr(null);
    if (!googleIsLive) {
      // No Client ID configured yet — proceed in demo mode.
      setProvider('google');
      setStep('quiz');
      return;
    }
    setSigningIn('google');
    try {
      const u = await signInWithGoogle();
      setProvider('google');
      setName((prev) => prev || u.name || '');
      setGoogleEmail(u.email);
      haptic('success');
      setStep('quiz');
    } catch {
      setSignInErr('Google sign-in was cancelled or failed. Try again.');
    } finally {
      setSigningIn(null);
    }
  }

  const setProfile = useUser((s) => s.setProfile);
  const setWeekPlan = useUser((s) => s.setWeekPlan);
  const addWeighIn = useUser((s) => s.addWeighIn);
  const navigate = useNavigate();

  const derived = useMemo(() => {
    const bmr = mifflinStJeor(sex, weightKg, heightCm, age);
    const td = tdee(bmr, activity);
    const macros = macrosFor(goal, td, weightKg);
    return { bmr, td, macros };
  }, [sex, weightKg, heightCm, age, activity, goal]);

  // Quiz answers may be multi-select (joined by ' · '); take the first day value.
  const daysPerWeek = Number((quiz['days'] ?? '4').split(' · ')[0]) || 4;
  const style = (quiz['style'] ?? 'A bit of everything').split(' · ')[0];

  function finish() {
    const profile: UserProfile = {
      id: 'me',
      name: name || 'Athlete',
      email: googleEmail,
      authProvider: provider,
      sex,
      age,
      heightCm,
      weightKg,
      goal,
      activity,
      experience,
      bodyFatPct: undefined,
      bmr: derived.bmr,
      tdee: derived.td,
      macros: derived.macros,
      quizAnswers: quiz,
      specialRequest: specialRequest.trim() || undefined,
      noWeekends,
      onboarded: true,
    };
    setProfile(profile);
    setWeekPlan(buildWeekPlan(daysPerWeek, style, goal, { noWeekends, includeCardio: true }));
    addWeighIn(weightKg);
    haptic('success');
    navigate('/home', { replace: true });
  }

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 py-12">
      <div className="flex items-center gap-2 mb-6">
        <ForgeLogo size={32} tile />
        <span className="font-extrabold text-xl tracking-tight">ForgeOS</span>
      </div>

      <Stepper step={step} />

      {step === 'signin' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
          <h1 className="text-3xl font-extrabold leading-tight">{t('ob.tagline')}</h1>
          <p className="text-muted">{t('ob.sub')}</p>

          {/* Big, obvious install CTA when opened in a browser */}
          <InstallButton variant="big" />

          <div className="space-y-2 pt-2">
            <Button variant="outline" className="w-full justify-center flex items-center gap-2" disabled={signingIn === 'google'} onClick={continueWithGoogle}>
              {signingIn === 'google' ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
              {signingIn === 'google' ? t('ob.connecting') : t('ob.google')}
            </Button>
            <Button variant="outline" className="w-full justify-center flex items-center gap-2" onClick={emailContinue}>
              <Mail size={18} /> {t('ob.email')}
            </Button>
            <button className="w-full text-sm text-muted pt-2" onClick={() => { setProvider('guest'); setStep('quiz'); }}>
              {t('ob.guest')}
            </button>
          </div>
          {signInErr && <p className="text-xs text-danger text-center">{signInErr}</p>}
          <p className="text-[11px] text-muted/70 text-center pt-2">
            {googleIsLive
              ? 'Google sign-in opens the real Google account picker.'
              : 'Demo mode — add a Google Client ID to enable real Google sign-in.'}
          </p>
        </motion.div>
      )}

      {step === 'quiz' && (
        <QuizStep quiz={quiz} setQuiz={setQuiz} onDone={() => setStep('metrics')} setName={setName} name={name} />
      )}

      {step === 'metrics' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
          <h2 className="text-2xl font-bold">Your numbers</h2>
          <p className="text-sm text-muted">Metric only — kg, cm, kcal.</p>

          <div className="flex gap-2">
            <Pill active={sex === 'male'} onClick={() => setSex('male')}>Male</Pill>
            <Pill active={sex === 'female'} onClick={() => setSex('female')}>Female</Pill>
          </div>

          <NumberRow label="Age" value={age} unit="yrs" set={setAge} min={14} max={90} step={1} />
          <NumberRow label="Height" value={heightCm} unit="cm" set={setHeightCm} min={130} max={220} step={1} />
          <NumberRow label="Weight" value={weightKg} unit="kg" set={setWeightKg} min={35} max={250} step={0.5} />

          <div>
            <p className="text-sm font-medium mb-2">Goal</p>
            <div className="flex gap-2 flex-wrap">
              {(['lose', 'recomp', 'maintain', 'gain', 'strength'] as Goal[]).map((g) => (
                <Pill key={g} active={goal === g} onClick={() => setGoal(g)}>{g}</Pill>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Daily activity</p>
            <div className="flex gap-2 flex-wrap">
              {(['sedentary', 'light', 'moderate', 'active', 'athlete'] as ActivityLevel[]).map((a) => (
                <Pill key={a} active={activity === a} onClick={() => setActivity(a)}>{a}</Pill>
              ))}
            </div>
          </div>

          <Card className="bg-surface-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              <MiniStat label="BMR" value={`${derived.bmr}`} />
              <MiniStat label="TDEE" value={`${derived.td}`} />
              <MiniStat label="Protein" value={`${derived.macros.proteinG}g`} />
              <MiniStat label="Cals" value={`${derived.macros.calories}`} />
            </div>
            <p className="text-[11px] text-muted mt-2">Mifflin-St Jeor · protein {(derived.macros.proteinG / weightKg).toFixed(1)} g/kg</p>
          </Card>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should we call you?"
            className="w-full rounded-xl bg-surface border border-line px-4 py-3 text-sm"
          />

          {/* Special requests for the generated plan */}
          <Card className="space-y-3 bg-surface-2">
            <p className="text-sm font-semibold">Special requests</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Don’t train on weekends</span>
              <Toggle checked={noWeekends} onChange={setNoWeekends} />
            </div>
            <textarea
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="Anything else? e.g. bad knees, no overhead pressing, short on time…"
              className="w-full rounded-xl bg-surface border border-line px-3 py-2 text-sm h-20"
            />
            <p className="text-[11px] text-muted/70">We’ll keep weekends as rest if toggled, and save your notes to your profile.</p>
          </Card>

          <Button className="w-full justify-center" onClick={() => setStep('test')}>Continue to fitness test</Button>
        </motion.div>
      )}

      {step === 'test' && (
        <FitnessTest
          onComplete={(score, level) => {
            setFitnessScore(score);
            setExperience(level);
            setStep('plan');
          }}
        />
      )}

      {step === 'plan' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 mt-6">
          <h2 className="text-2xl font-bold">Your starting point</h2>
          <Card className="bg-surface-2 space-y-1">
            <p className="text-sm">Estimated level: <b className="capitalize">{experience}</b></p>
            <p className="text-sm">Body-fat range: <b>{bodyFatBand(sex, fitnessScore)}</b></p>
            <p className="text-sm">Plan: <b>{daysPerWeek} days/week</b> · {style}</p>
          </Card>
          <p className="text-sm text-muted">
            We generated an editable week plan. You can change training days and swap workouts anytime from the Profile tab.
          </p>
          <PlanPreview days={daysPerWeek} style={style} goal={goal} noWeekends={noWeekends} />
          <Button className="w-full justify-center" onClick={finish}>{t('ob.enter')}</Button>
        </motion.div>
      )}

      <EmailAuthSheet
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        onAuthed={(email) => { setProvider('email'); setGoogleEmail(email); setEmailOpen(false); haptic('success'); setStep('quiz'); }}
      />
    </div>
  );
}

function EmailAuthSheet({ open, onClose, onAuthed }: { open: boolean; onClose: () => void; onAuthed: (email: string) => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const res = mode === 'up' ? await signUpWithEmail(email, pw) : await signInWithEmail(email, pw);
      if ('error' in res && res.error) {
        setErr(typeof res.error === 'string' ? res.error : (res.error as { message?: string }).message ?? 'Failed');
        return;
      }
      onAuthed(email);
    } catch {
      setErr('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={mode === 'up' ? 'Create account' : 'Sign in'}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Pill active={mode === 'up'} onClick={() => setMode('up')}>Sign up</Pill>
          <Pill active={mode === 'in'} onClick={() => setMode('in')}>Sign in</Pill>
        </div>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-3 text-sm" />
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-3 text-sm" />
        {err && <p className="text-xs text-danger">{err}</p>}
        <Button className="w-full justify-center" disabled={busy || !email || pw.length < 6} onClick={submit}>
          {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}
        </Button>
        <p className="text-[11px] text-muted/70">Real accounts via Supabase. Passwords are min. 6 characters.</p>
      </div>
    </Sheet>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ['signin', 'quiz', 'metrics', 'test', 'plan'];
  const idx = order.indexOf(step);
  return (
    <div className="flex gap-1.5">
      {order.map((s, i) => (
        <div key={s} className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-accent' : 'bg-surface-2'}`} />
      ))}
    </div>
  );
}

function QuizStep({
  quiz,
  setQuiz,
  onDone,
  name,
  setName,
}: {
  quiz: Record<string, string>;
  setQuiz: (q: Record<string, string>) => void;
  onDone: () => void;
  name: string;
  setName: (n: string) => void;
}) {
  const SEP = ' · ';
  const [i, setI] = useState(0);
  const q = ICE_BREAKER[i];
  const [custom, setCustom] = useState('');
  const isLast = i === ICE_BREAKER.length - 1;

  const selected = quiz[q.id] ? quiz[q.id].split(SEP) : [];

  function setSelected(next: string[]) {
    const copy = { ...quiz };
    if (next.length) copy[q.id] = next.join(SEP);
    else delete copy[q.id];
    setQuiz(copy);
  }

  function toggle(option: string) {
    haptic('tap');
    setSelected(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
  }

  function addCustom() {
    const v = custom.trim();
    if (!v || selected.includes(v)) return;
    haptic('tap');
    setSelected([...selected, v]);
    setCustom('');
  }

  function next() {
    haptic('tap');
    if (isLast) onDone();
    else setI(i + 1);
  }

  return (
    <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 mt-6">
      <p className="text-xs text-muted">Question {i + 1} of {ICE_BREAKER.length} · pick all that apply</p>
      <h2 className="text-2xl font-bold leading-snug">{q.q}</h2>
      <div className="space-y-2">
        {q.options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              onClick={() => toggle(o)}
              className={`w-full flex items-center gap-3 text-left rounded-xl border px-4 py-3 text-sm transition active:scale-[0.99] ${
                on ? 'border-accent bg-accent/10' : 'border-line bg-surface hover:bg-surface-2'
              }`}
            >
              <span className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center ${on ? 'bg-accent border-accent text-black' : 'border-line'}`}>
                {on && <Check size={13} strokeWidth={3} />}
              </span>
              {o}
            </button>
          );
        })}

        {/* custom answers the user has added show as removable chips */}
        {selected.filter((s) => !q.options.includes(s)).map((s) => (
          <button key={s} onClick={() => toggle(s)} className="w-full flex items-center gap-3 text-left rounded-xl border border-accent bg-accent/10 px-4 py-3 text-sm">
            <span className="w-5 h-5 shrink-0 rounded-md bg-accent border-accent text-black flex items-center justify-center"><Check size={13} strokeWidth={3} /></span>
            {s} <span className="ml-auto text-xs text-muted">tap to remove</span>
          </button>
        ))}

        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCustom(); }}
            placeholder="…or write your own"
            className="flex-1 rounded-xl bg-surface border border-line px-4 py-3 text-sm"
          />
          <Button variant="ghost" disabled={!custom.trim()} onClick={addCustom}>Add</Button>
        </div>
      </div>

      {i === 0 && (
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full rounded-xl bg-surface border border-line px-4 py-3 text-sm"
        />
      )}

      <div className="flex items-center gap-2 pt-1">
        {i > 0 && <Button variant="outline" onClick={() => setI(i - 1)}>← Back</Button>}
        <Button className="flex-1 justify-center" disabled={selected.length === 0} onClick={next}>
          {isLast ? 'Finish' : 'Next'} {selected.length > 0 && `(${selected.length})`}
        </Button>
      </div>
      {selected.length === 0 && <p className="text-[11px] text-muted/70 text-center">Select at least one option to continue.</p>}
    </motion.div>
  );
}

function NumberRow({
  label,
  value,
  unit,
  set,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  unit: string;
  set: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium w-16">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="flex-1 accent-[rgb(var(--accent))]"
      />
      <span className="font-mono text-sm w-20 text-right">{value} {unit}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono font-bold">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

function PlanPreview({ days, style, goal, noWeekends }: { days: number; style: string; goal: Goal; noWeekends?: boolean }) {
  const plan = useMemo(() => buildWeekPlan(days, style, goal, { noWeekends, includeCardio: true }), [days, style, goal, noWeekends]);
  return (
    <div className="grid grid-cols-7 gap-1">
      {plan.days.map((d) => (
        <div key={d.day} className={`rounded-lg p-2 text-center ${d.rest ? 'bg-surface' : 'bg-accent/15'}`}>
          <p className="text-[10px] text-muted">{d.day}</p>
          <p className="text-[10px] font-semibold mt-1 leading-tight">{d.rest ? 'Rest' : d.label}</p>
        </div>
      ))}
    </div>
  );
}
