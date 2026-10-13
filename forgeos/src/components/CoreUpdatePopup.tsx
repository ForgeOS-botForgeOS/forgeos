import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { Sheet, Button } from './ui';
import { useT } from '../lib/i18n';
import { toast } from '../lib/toast';
import { checkForApkUpdate, fetchLatestApkVersion } from '../lib/appUpdate';
import { installApkUpdate, syncWebUpdate } from '../lib/webUpdate';
import { loadMemory, recordShown, saveMemory, shouldShowUpdatePopup } from '../lib/updatePopup';
import { useWorkout } from '../state/workoutStore';

// Let the first screen settle before asking for anything.
const SETTLE_MS = 4000;
// Another popup (daily quote, tour, rank-up…) goes first; check back this
// often, and give up for this launch after WAIT_LIMIT_MS rather than wait forever.
const POLL_MS = 1500;
const WAIT_LIMIT_MS = 3 * 60 * 1000;

/** Every full-screen popup in the app marks itself aria-modal. */
const screenIsClear = () => !document.querySelector('[aria-modal="true"]');

/**
 * The "new version" popup for core (APK) updates: the only update the user
 * has to act on, since web changes install themselves. When it may appear is
 * decided by lib/updatePopup.ts (once a day at most, three times per version,
 * never mid-workout). No-op on the website and on an up-to-date app.
 */
export function CoreUpdatePopup() {
  const t = useT();
  const navigate = useNavigate();
  const [version, setVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const consider = async (available: boolean) => {
      if (!available || cancelled) return;
      const v = (await fetchLatestApkVersion()) ?? 'core';
      const allowed = () => shouldShowUpdatePopup(loadMemory(), v, Date.now(), useWorkout.getState().active != null);
      if (cancelled || !allowed()) return;
      const giveUpAt = Date.now() + WAIT_LIMIT_MS;
      while (!screenIsClear()) {
        if (cancelled || Date.now() > giveUpAt) return;
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      // Re-check: a workout may have started while we waited.
      if (cancelled || !allowed()) return;
      saveMemory(recordShown(loadMemory(), v, Date.now()));
      setVersion(v);
    };
    const timer = setTimeout(() => {
      void checkForApkUpdate().then((u) => consider(u.available));
    }, SETTLE_MS);
    // Phones keep the app alive for days: re-check when it comes back to the
    // front (syncWebUpdate rate-limits itself to once per 30 min).
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncWebUpdate().then((r) => consider(r.nativeUpdate));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  async function update() {
    setInstalling(true);
    toast(t('upd.getting'), 'info');
    const started = await installApkUpdate();
    setInstalling(false);
    setVersion(null);
    if (!started) navigate('/download');
  }

  return (
    <Sheet open={version !== null} onClose={() => setVersion(null)} title={t('upd.title')}>
      <div className="flex flex-col items-center gap-3 pt-1 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15">
          <Rocket size={30} className="text-accent" />
        </div>
        {version && version !== 'core' && <p className="font-mono text-sm text-muted">v{version}</p>}
        <p className="text-sm">{t('upd.body')}</p>
        <Button className="mt-2 w-full justify-center py-3 text-base" disabled={installing} onClick={() => { void update(); }}>
          {installing ? t('upd.getting') : t('upd.now')}
        </Button>
        <Button variant="ghost" className="w-full justify-center" onClick={() => setVersion(null)}>
          {t('upd.later')}
        </Button>
        <p className="text-[11px] text-muted">{t('upd.where')}</p>
      </div>
    </Sheet>
  );
}
