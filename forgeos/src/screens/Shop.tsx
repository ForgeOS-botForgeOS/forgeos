import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Coins, Check, Lock } from 'lucide-react';
import { Card, Button, Pill, Badge } from '../components/ui';
import { ALL_COSMETICS, type Cosmetic } from '../data/cosmetics';
import { useCosmetics } from '../state/cosmeticsStore';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';
import type { ThemeId } from '../types';

const THEME_SWATCH: Record<string, string> = {
  'emerald-forge': '#10b981', 'cyber-lime': '#a3e635', 'obsidian-platinum': '#94a3b8',
  'royal-amethyst': '#a855f7', 'synthwave': '#ec4899', 'blood-moon': '#ef4444', 'solar-flare': '#f59e0b',
};
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { CountUp } from '../components/CountUp';

export default function Shop() {
  const navigate = useNavigate();
  const coins = useGami((s) => s.coins);
  const spend = useGami((s) => s.spendCoins);
  const { owned, own, equippedTitle, equippedFrame, equipTitle, equipFrame } = useCosmetics();
  const setSetting = useSettings((s) => s.set);
  const curTheme = useSettings((s) => s.theme);
  const [tab, setTab] = useState<'title' | 'frame' | 'theme'>('title');

  // Exclusives sit at the end of their tab: visible (so you know they exist and
  // what earns them) but never for sale.
  const list = ALL_COSMETICS.filter((c) => c.type === tab).sort((a, b) => Number(!!a.exclusive) - Number(!!b.exclusive));

  function buy(id: string, price: number) {
    if (owned.includes(id)) return;
    const c = ALL_COSMETICS.find((x) => x.id === id);
    if (c?.exclusive) { haptic('warning'); toast('That one is earned, not bought — check Achievements.', 'error'); return; }
    if (spend(price)) { own(id); celebrate(); toast(`Unlocked ${c?.name ?? 'item'} 🎉`); } else { haptic('warning'); toast(`Not enough coins — need 🪙${price}.`, 'error'); }
  }
  function applyOrEquip(c: Cosmetic) {
    if (c.type === 'theme') { setSetting('theme', c.value as ThemeId); haptic('success'); toast(`Applied ${c.name} 🎨`); return; }
    const equipped = c.type === 'title' ? equippedTitle : equippedFrame;
    const fn = c.type === 'title' ? equipTitle : equipFrame;
    fn(equipped === c.id ? null : c.id); // toggle off if already equipped
    haptic('tap');
  }
  const isEquipped = (c: Cosmetic) => c.type === 'theme' ? curTheme === c.value : (c.type === 'title' ? equippedTitle : equippedFrame) === c.id;

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-extrabold">Forge Shop</h1>
        <Badge color="rgb(var(--accent-2))"><span className="flex items-center gap-1"><Coins size={12} /> <CountUp value={coins} /></span></Badge>
      </div>

      <div className="flex gap-2" data-noswipe>
        <Pill active={tab === 'title'} onClick={() => setTab('title')}>Titles</Pill>
        <Pill active={tab === 'frame'} onClick={() => setTab('frame')}>Frames</Pill>
        <Pill active={tab === 'theme'} onClick={() => setTab('theme')}>Themes</Pill>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {list.map((c) => {
          const have = owned.includes(c.id);
          const equipped = isEquipped(c);
          return (
            <Card key={c.id} className="space-y-2 text-center">
              {c.type === 'frame' ? (
                <div className="mx-auto w-12 h-12 rounded-full p-[3px]" style={{ background: c.value }}>
                  <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-xs font-bold text-accent">ME</div>
                </div>
              ) : c.type === 'theme' ? (
                <div className="mx-auto w-12 h-12 rounded-xl" style={{ background: THEME_SWATCH[c.value] ?? 'rgb(var(--accent))' }} />
              ) : (
                <p className="text-sm font-bold text-accent-2 py-2">“{c.value}”</p>
              )}
              <p className="text-sm font-semibold">{c.name}</p>
              {have ? (
                <Button variant={equipped ? 'primary' : 'ghost'} className="w-full justify-center py-1.5" onClick={() => applyOrEquip(c)}>
                  {equipped ? <span className="flex items-center gap-1"><Check size={14} /> {c.type === 'theme' ? 'Active' : 'Equipped'}</span> : (c.type === 'theme' ? 'Apply' : 'Equip')}
                </Button>
              ) : c.exclusive ? (
                <div className="rounded-xl border border-dashed border-accent-2/60 px-2 py-1.5">
                  <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent-2"><Lock size={10} /> achievement</p>
                  <p className="text-[10px] leading-tight text-muted">{c.earnedBy}</p>
                </div>
              ) : (
                <Button variant="outline" className="w-full justify-center py-1.5" disabled={coins < c.price} onClick={() => buy(c.id, c.price)}>🪙 {c.price}</Button>
              )}
            </Card>
          );
        })}
      </div>
      <p className="text-[11px] text-muted/70">Earn Forge Coins from quests, milestones and XP conversion.</p>
    </div>
  );
}
