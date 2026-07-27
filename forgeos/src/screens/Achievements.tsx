import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Gift, Sparkles } from 'lucide-react';
import { Card, Button, Pill, Badge } from '../components/ui';
import { TIER_COLOR } from '../data/achievements';
import { cosmeticById } from '../data/cosmetics';
import { useGami } from '../state/gamificationStore';
import { useCosmetics } from '../state/cosmeticsStore';
import { useAchievements } from '../state/useAchievements';
import {
  filterAchievements,
  sortForDisplay,
  type AchievementFilter,
  type EvaluatedAchievement,
} from '../lib/achievementRewards';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { useT } from '../lib/i18n';

const FILTERS: AchievementFilter[] = ['claimable', 'all', 'locked', 'bronze', 'silver', 'gold', 'legendary'];

export default function Achievements() {
  const navigate = useNavigate();
  const t = useT();
  const claimAchievement = useGami((s) => s.claimAchievement);
  const own = useCosmetics((s) => s.own);
  const [filter, setFilter] = useState<AchievementFilter>('all');
  const { evaluated, pending, banked, unlockedCount } = useAchievements();

  const shown = useMemo(() => sortForDisplay(filterAchievements(evaluated, filter)), [evaluated, filter]);

  // Pay out one achievement: XP + coins through the store, plus any cosmetic
  // that can only be earned this way.
  function claim(a: EvaluatedAchievement) {
    if (!claimAchievement(a.id, a.reward.xp, a.reward.coins)) return;
    haptic('success');
    if (a.reward.cosmeticId) {
      own(a.reward.cosmeticId);
      celebrate();
      const c = cosmeticById(a.reward.cosmeticId);
      toast(`${a.title} claimed — unlocked ${c?.name ?? 'an exclusive reward'} ✨`);
    } else {
      toast(`${a.title} claimed · +${a.reward.xp} XP · 🪙${a.reward.coins}`);
    }
  }

  function claimAll() {
    const list = evaluated.filter((x) => x.claimable);
    if (!list.length) return;
    let xpSum = 0;
    let coinSum = 0;
    const unlockedNames: string[] = [];
    for (const a of list) {
      if (!claimAchievement(a.id, a.reward.xp, a.reward.coins)) continue;
      xpSum += a.reward.xp;
      coinSum += a.reward.coins;
      if (a.reward.cosmeticId) {
        own(a.reward.cosmeticId);
        unlockedNames.push(cosmeticById(a.reward.cosmeticId)?.name ?? 'exclusive reward');
      }
    }
    haptic('success');
    celebrate();
    toast(
      unlockedNames.length
        ? `${list.length} claimed · +${xpSum} XP · 🪙${coinSum} · ${unlockedNames.join(', ')} ✨`
        : `${list.length} claimed · +${xpSum} XP · 🪙${coinSum}`,
    );
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> {t('common.back')}</button>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{t('ach.title')}</h1>
          <p className="text-xs text-muted">
            {banked.count > 0
              ? `${t('ach.banked')} +${banked.xp.toLocaleString()} XP · 🪙${banked.coins.toLocaleString()}`
              : t('ach.bankedNone')}
          </p>
        </div>
        <span className="font-mono font-bold text-accent">{unlockedCount}/{evaluated.length}</span>
      </div>

      {/* Rewards waiting to be collected */}
      {pending.count > 0 && (
        <Card className="space-y-2 border-accent/50">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-accent" />
            <p className="text-sm font-semibold">{t('ach.pending', { n: pending.count })}</p>
          </div>
          <p className="text-xs text-muted">
            +{pending.xp.toLocaleString()} XP · 🪙{pending.coins.toLocaleString()}
            {pending.cosmeticIds.length > 0 && ` · ${pending.cosmeticIds.length}× ${t('ach.exclusive')}`}
          </p>
          <Button className="w-full justify-center" onClick={claimAll}>{t('ach.claimAll')}</Button>
        </Card>
      )}

      <div data-noswipe className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {FILTERS.map((f) => (
          <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
            {t(`ach.filter.${f}`)}{f === 'claimable' && pending.count > 0 ? ` (${pending.count})` : ''}
          </Pill>
        ))}
      </div>

      {shown.length === 0 && <p className="text-sm text-muted">{t('ach.emptyFilter')}</p>}

      <div className="grid grid-cols-2 gap-2">
        {shown.map((a) => {
          const cosmetic = a.cosmeticId ? cosmeticById(a.cosmeticId) : undefined;
          return (
            <Card
              key={a.id}
              className={`space-y-1 text-center ${a.claimable ? 'border-accent/60' : a.unlocked ? '' : 'opacity-80'}`}
              style={a.tier === 'legendary' && a.unlocked ? { borderColor: TIER_COLOR.legendary } : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: TIER_COLOR[a.tier] }}>{t(`ach.tier.${a.tier}`)}</span>
                {a.claimed && <span className="text-[9px] text-muted">✓</span>}
              </div>
              <div className="text-3xl">{a.unlocked ? a.icon : <Lock size={24} className="mx-auto text-muted" />}</div>
              <p className="text-sm font-semibold leading-tight">{a.title}</p>
              <p className="text-[11px] leading-tight text-muted">{a.desc}</p>

              {!a.unlocked && (
                <>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${a.pct}%` }} />
                  </div>
                  <p className="font-mono text-[10px] text-muted">{Math.round(a.value).toLocaleString()}/{a.goal.toLocaleString()}</p>
                </>
              )}

              {/* The reward is visible before you earn it — that's the pull */}
              <p className="text-[10px] text-muted">
                +{a.reward.xp.toLocaleString()} XP · 🪙{a.reward.coins}
              </p>
              {cosmetic && (
                <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-accent-2">
                  <Sparkles size={10} /> {cosmetic.name}
                </div>
              )}

              {a.claimable && (
                <Button className="w-full justify-center py-1.5 text-xs" onClick={() => claim(a)}>{t('ach.claim')}</Button>
              )}
              {a.claimed && <Badge color="rgb(var(--success))">{t('ach.claimed')}</Badge>}
            </Card>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-muted/70">{t('ach.footnote')}</p>
    </div>
  );
}
