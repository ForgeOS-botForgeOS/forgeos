import { GraduationCap, Flame } from 'lucide-react';
import { Card } from './ui';
import { useSettings } from '../state/settingsStore';
import { useT } from '../lib/i18n';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';

/**
 * Apprentice Mode ⟷ Full Forge, as two cards you pick between.
 *
 * Shown on the Apprentice home *and* in You → settings, because the single
 * worst thing a beginner mode can do is feel like a trap: the way back has to
 * be visible from inside it, and switching must never be able to lose anything
 * (it doesn't — it is one boolean, and every screen and route stays exactly
 * where it was).
 */
export function ModeSwitch() {
  const t = useT();
  const apprentice = useSettings((s) => s.apprentice);
  const set = useSettings((s) => s.set);

  function choose(next: boolean) {
    if (next === apprentice) return;
    set('apprentice', next);
    haptic('success');
    toast(next ? t('app.switchedSimple') : t('app.switchedFull'));
  }

  return (
    <Card className="space-y-2">
      <p className="text-sm font-bold">{t('app.switchTitle')}</p>
      <p className="text-[11px] text-muted">{t('app.switchBody')}</p>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Option
          active={apprentice}
          icon={<GraduationCap size={16} />}
          title={t('app.mode')}
          body={t('app.modeBody')}
          onClick={() => choose(true)}
        />
        <Option
          active={!apprentice}
          icon={<Flame size={16} />}
          title={t('app.full')}
          body={t('app.fullBody')}
          onClick={() => choose(false)}
        />
      </div>
    </Card>
  );
}

function Option({ active, icon, title, body, onClick }: { active: boolean; icon: React.ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border p-3 text-left transition active:scale-[0.98] ${active ? 'border-accent bg-accent/10' : 'border-line bg-surface-2'}`}
    >
      <span className={active ? 'text-accent' : 'text-muted'}>{icon}</span>
      <p className="text-sm font-semibold mt-1">{title}</p>
      <p className="text-[10px] text-muted leading-snug mt-0.5">{body}</p>
    </button>
  );
}
