import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Globe, Loader2, Check, Eye, EyeOff, Download } from 'lucide-react';
import { Button, Card, Pill, Sheet, Toggle } from '../../components/ui';
import { ForgeLogo } from '../../components/ForgeLogo';
import { InstallButton } from '../../components/InstallButton';
import { isStandalone } from '../../lib/pwaInstall';
import { isBackendLive, signInWithEmail, signUpWithEmail, signInWithOAuth, currentAuthUser, sendPasswordReset, clearSignedOut } from '../../lib/supabase';
import { fetchProfile } from '../../lib/repositories';
import { ICE_BREAKER } from '../../data/quests';
import { useUser } from '../../state/userStore';
import { macrosFor, mifflinStJeor, tdee, bodyFatBand } from '../../lib/fitness';
import { signInWithGoogle, googleIsLive } from '../../lib/googleAuth';
import { ensureCloudAccount } from '../../lib/activitySync';
import { pullCloudBackup, pushCloudBackup } from '../../lib/cloudSync';
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
  const [authMode, setAuthMode] = useState<'in' | 'up'>('up');
  const [noWeekends, setNoWeekends] = useState(false);
  const [specialRequest, setSpecialRequest] = useState('');

  function emailContinue() {
    if (!isBackendLive) {
      // No backend yet — proceed in demo mode.
      setProvider('email');
      setStep('quiz');
      return;
    }
    setAuthMode('up');
    setEmailOpen(true);
  }

  function loginExisting() {
    setAuthMode('in');
    setEmailOpen(true);
  }

  async function continueWithGoogle() {
    setSignInErr(null);
    clearSignedOut(); // explicit sign-in → allow sessions again
    // Real cloud account: route Google through Supabase OAuth (redirect). This
    // is the only Google path that creates a real session, so friends/activity
    // actually sync. Needs the Google provider enabled in Supabase; if it isn't,
    // signInWithOAuth returns an error before redirecting and we fall back to the
    // client-side profile-only flow below (no regression).
    if (isBackendLive) {
      setSigningIn('google');
      try {
        const res = await signInWithOAuth('google');
        if (!('error' in res) || !res.error) return; // redirecting to Google…
      } catch { /* fall through to local flow */ }
      setSigningIn(null);
    }
    await continueWithGoogleLocal();
  }

  // Client-side Google (no Supabase session) — fills name/email only. Used when
  // there's no backend or the Supabase Google provider isn't configured.
  async function continueWithGoogleLocal() {
    if (!googleIsLive) {
      setProvider('google');
      if (!(await restoreExistingAccount())) setStep('quiz');
      return;
    }
    setSigningIn('google');
    try {
      const u = await signInWithGoogle();
      setProvider('google');
      setName((prev) => prev || u.name || '');
      setGoogleEmail(u.email);
      haptic('success');
      // If they already have an account/profile, skip the quiz.
      if (!(await restoreExistingAccount())) setStep('quiz');
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

  // Pull an existing account's profile straight into the app, skipping the
  // whole onboarding quiz. Returns true if a saved profile was restored.
  async function restoreExistingAccount(): Promise<boolean> {
    const user = await currentAuthUser();
    if (user) {
      // 1) Full cloud progress (workouts, XP, PRs — everything under forge-*).
      // Reload so every store re-hydrates; only when the backup is onboarded, so
      // it can't reload-loop on a half-set-up account.
      const pulled = await pullCloudBackup();
      if (pulled === 'restored') {
        let restoredOnboarded = false;
        try {
          restoredOnboarded = !!JSON.parse(localStorage.getItem('forge-user') ?? '{}')?.state?.profile?.onboarded;
        } catch { /* malformed dump — fall through */ }
        if (restoredOnboarded) {
          haptic('success');
          window.location.hash = '#/home';
          location.reload();
          return true;
        }
      }
      // 2) A finished profile row in the cloud → restore it.
      const remote = await fetchProfile(user.id);
      if (remote && remote.onboarded) {
        setProfile({ ...remote, id: user.id, email: remote.email ?? user.email });
        haptic('success');
        navigate('/home', { replace: true });
        return true;
      }
    }
    // 3) Already set up ON THIS DEVICE (e.g. a pre-backend account, or a guest):
    // keep that profile, link it to the cloud + push progress up, and skip the
    // quiz. Works with or without a session.
    const local = useUser.getState().profile;
    if (local?.onboarded) {
      if (isBackendLive) void ensureCloudAccount();
      void pushCloudBackup();
      haptic('success');
      navigate('/home', { replace: true });
      return true;
    }
    return false;
  }

  useEffect(() => {
    // Already set up on THIS device → never show the first-time quiz. Go
    // straight in and link this profile to a cloud session in the background.
    if (useUser.getState().profile?.onboarded) {
      if (isBackendLive) void ensureCloudAccount();
      navigate('/home', { replace: true });
      return;
    }
    // Otherwise (fresh device / back from a Google OAuth redirect) try to restore
    // an existing account from the cloud. The reload in step 1 only fires for an
    // onboarded backup, so this can't loop.
    if (isBackendLive) void restoreExistingAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish() {
    // Guarantee a real cloud session (anonymous if needed) BEFORE stamping the
    // profile id, so Google/guest accounts become synced cloud accounts exactly
    // like email ones — everything works the same.
    clearSignedOut();
    await ensureCloudAccount();
    const user = await currentAuthUser();
    const profile: UserProfile = {
      id: user?.id ?? 'me',
      name: name || 'Athlete',
      email: googleEmail ?? user?.email,
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

          {/* Install / download CTAs — only in a browser, never inside the app. */}
          {!isStandalone() && (
            <>
              <InstallButton variant="big" />
              <Button variant="outline" className="w-full justify-center flex items-center gap-2" onClick={() => navigate('/download')}>
                <Download size={16} /> Download the Android app
              </Button>
            </>
          )}

          <div className="space-y-2 pt-2">
            <Button variant="outline" className="w-full justify-center flex items-center gap-2" disabled={signingIn === 'google'} onClick={continueWithGoogle}>
              {signingIn === 'google' ? <Loader2 size={18} className="animate-spin" /> : <Globe size={18} />}
              {signingIn === 'google' ? t('ob.connecting') : t('ob.google')}
            </Button>
            <Button variant="outline" className="w-full justify-center flex items-center gap-2" onClick={emailContinue}>
              <Mail size={18} /> {t('ob.email')}
            </Button>
            <button className="w-full text-sm text-muted pt-2" onClick={async () => { clearSignedOut(); setProvider('guest'); if (!(await restoreExistingAccount())) setStep('quiz'); }}>
              {t('ob.guest')}
            </button>
          </div>

          {isBackendLive && (
            <div className="pt-1 text-center text-sm">
              <span className="text-muted">Already have an account? </span>
              <button className="font-semibold text-accent underline-offset-2 hover:underline" onClick={loginExisting}>
                Log in
              </button>
            </div>
          )}
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
        initialMode={authMode}
        onClose={() => setEmailOpen(false)}
        onAuthed={async (email, mode) => {
          clearSignedOut();
          setProvider('email');
          setGoogleEmail(email);
          setEmailOpen(false);
          // Existing account → restore their profile and go straight in.
          if (mode === 'in' && (await restoreExistingAccount())) return;
          haptic('success');
          setStep('quiz');
        }}
      />
    </div>
  );
}

function EmailAuthSheet({ open, initialMode = 'up', onClose, onAuthed }: { open: boolean; initialMode?: 'in' | 'up'; onClose: () => void; onAuthed: (email: string, mode: 'in' | 'up') => void }) {
  const [mode, setMode] = useState<'in' | 'up'>(initialMode);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Respect the chosen entry point (Sign up vs Log in) each time it opens.
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErr(null);
      setNotice(null);
      setShow(false);
    }
  }, [open, initialMode]);

  async function forgotPassword() {
    setErr(null);
    setNotice(null);
    if (!email) { setErr('Enter your email above first, then tap “Forgot password”.'); return; }
    const res = await sendPasswordReset(email);
    if ('error' in res && res.error) {
      setErr(typeof res.error === 'string' ? 'Password reset needs an email account.' : res.error.message);
      return;
    }
    setNotice(`Reset link sent to ${email}. Check your inbox to set a new password.`);
  }

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const res = mode === 'up' ? await signUpWithEmail(email, pw) : await signInWithEmail(email, pw);
      if ('error' in res && res.error) {
        setErr(typeof res.error === 'string' ? res.error : (res.error as { message?: string }).message ?? 'Failed');
        return;
      }
      onAuthed(email, mode);
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
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-3 pr-11 text-sm" />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {mode === 'in' && (
          <button type="button" onClick={forgotPassword} className="text-xs text-accent text-left underline-offset-2 hover:underline">Forgot password?</button>
        )}
        {err && <p className="text-xs text-danger">{err}</p>}
        {notice && <p className="text-xs text-accent-2">{notice}</p>}
        <Button className="w-full justify-center" disabled={busy || !email || pw.length < 6} onClick={submit}>
          {busy ? 'Please wait…' : mode === 'up' ? 'Create account' : 'Sign in'}
        </Button>
        <p className="text-[11px] text-muted/70">Real accounts via Supabase. Passwords are min. 6 characters. Tap the eye to show what you type — your existing password can’t be displayed (it’s stored encrypted).</p>
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
