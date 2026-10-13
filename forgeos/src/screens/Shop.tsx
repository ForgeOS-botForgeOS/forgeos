import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Coins, Check, Lock } from 'lucide-react';
import { Card, Button, Pill, Badge, Sheet } from '../components/ui';
import { ALL_COSMETICS, type Cosmetic, type CosmeticType } from '../data/cosmetics';
import { useCosmetics } from '../state/cosmeticsStore';
import { useGami } from '../state/gamificationStore';
import { useSettings } from '../state/settingsStore';
import type { ThemeId } from '../types';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { CHEST_PRICE, FREEZE_PRICE, REROLL_PRICE, chestPool, pickChestItem, rarityOf, type Rarity } from '../lib/shop';
import { CountUp } from '../components/CountUp';

const THEME_SWATCH: Record<string, string> = {
  'emerald-forge': '#10b981', 'cyber-lime': '#a3e635', 'obsidian-platinum': '#94a3b8',
  'royal-amethyst': '#a855f7', 'synthwave': '#ec4899', 'blood-moon': '#ef4444', 'solar-flare': '#f59e0b',
};

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'rgb(var(--muted))', rare: '#38bdf8', epic: '#a855f7', legendary: '#f59e0b',
};

type Tab = CosmeticType | 'power';
const TABS: { id: Tab; label: string }[] = [
  { id: 'power', label: 'Power-ups' },
  { id: 'title', label: 'Titles' },
  { id: 'badge', label: 'Badges' },
  { id: 'frame', label: 'Frames' },
  { id: 'confetti', label: 'Confetti' },
  { id: 'theme', label: 'Themes' },
];

export default function Shop() {
  const navigate = useNavigate();
  const coins = useGami((s) => s.coins);
  const [tab, setTab] = useState<Tab>('power');

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-extrabold">Forge Shop</h1>
        <Badge color="rgb(var(--accent-2))"><span className="flex items-center gap-1"><Coins size={12} /> <CountUp value={coins} /></span></Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4" data-noswipe>
        {TABS.map((t) => (
          <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Pill>
        ))}
      </div>

      {tab === 'power' ? <PowerUps /> : <CosmeticGrid type={tab} />}
      <p className="text-[11px] text-muted/70">Earn Forge Coins from quests, milestones and XP conversion. Everything here is for fun: coins never buy XP or rank.</p>
    </div>
  );
}

/** Equip/apply logic shared by the grid and the chest reveal. */
function useEquip() {
  const c = useCosmetics();
  const setSetting = useSettings((s) => s.set);
  const curTheme = useSettings((s) => s.theme);
  const slot = (type: CosmeticType) =>
    type === 'title' ? c.equippedTitle : type === 'frame' ? c.equippedFrame : type === 'badge' ? c.equippedBadge : c.equippedConfetti;
  const isEquipped = (item: Cosmetic) => (item.type === 'theme' ? curTheme === item.value : slot(item.type) === item.id);
  function equip(item: Cosmetic) {
    if (item.type === 'theme') { setSetting('theme', item.value as ThemeId); haptic('success'); toast(`Applied ${item.name} 🎨`); return; }
    const fn = { title: c.equipTitle, frame: c.equipFrame, badge: c.equipBadge, confetti: c.equipConfetti }[item.type];
    const turningOn = slot(item.type) !== item.id;
    fn(turningOn ? item.id : null); // tap again to take it off
    haptic('tap');
    // Confetti is best explained by showing it.
    if (item.type === 'confetti' && turningOn) setTimeout(celebrate, 50);
  }
  return { owned: c.owned, own: c.own, isEquipped, equip };
}

function Preview({ c }: { c: Cosmetic }) {
  if (c.type === 'frame') {
    return (
      <div className="mx-auto w-12 h-12 rounded-full p-[3px]" style={{ background: c.value }}>
        <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-xs font-bold text-accent">ME</div>
      </div>
    );
  }
  if (c.type === 'theme') return <div className="mx-auto w-12 h-12 rounded-xl" style={{ background: THEME_SWATCH[c.value] ?? 'rgb(var(--accent))' }} />;
  if (c.type === 'badge') return <p className="text-4xl leading-[3rem]">{c.value}</p>;
  if (c.type === 'confetti') return <p className="text-2xl leading-[3rem] tracking-widest">{c.value.split(',').join('')}</p>;
  return <p className="text-sm font-bold text-accent-2 py-2">“{c.value}”</p>;
}

function CosmeticGrid({ type }: { type: CosmeticType }) {
  const coins = useGami((s) => s.coins);
  const spend = useGami((s) => s.spendCoins);
  const equippedConfetti = useCosmetics((s) => s.equippedConfetti);
  const equipConfetti = useCosmetics((s) => s.equipConfetti);
  const { owned, own, isEquipped, equip } = useEquip();

  // Cheapest first; exclusives sit at the end: visible (so you know they exist
  // and what earns them) but never for sale.
  const list = ALL_COSMETICS.filter((c) => c.type === type)
    .sort((a, b) => Number(!!a.exclusive) - Number(!!b.exclusive) || a.price - b.price);

  function buy(c: Cosmetic) {
    if (owned.includes(c.id)) return;
    if (c.exclusive) { haptic('warning'); toast('That one is earned, not bought: check Achievements.', 'error'); return; }
    if (spend(c.price)) { own(c.id); celebrate(); toast(`Unlocked ${c.name} 🎉`); } else { haptic('warning'); toast(`Not enough coins: need 🪙${c.price}.`, 'error'); }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {type === 'confetti' && (
        <Card className="space-y-2 text-center">
          <p className="text-2xl leading-[3rem]">🎊</p>
          <p className="text-sm font-semibold">Classic</p>
          <Button variant={equippedConfetti ? 'ghost' : 'primary'} className="w-full justify-center py-1.5" onClick={() => { equipConfetti(null); haptic('tap'); }}>
            {equippedConfetti ? 'Equip' : <span className="flex items-center gap-1"><Check size={14} /> Equipped</span>}
          </Button>
        </Card>
      )}
      {list.map((c) => {
        const have = owned.includes(c.id);
        const equipped = isEquipped(c);
        const rarity = rarityOf(c.price);
        return (
          <Card key={c.id} className="space-y-2 text-center">
            <Preview c={c} />
            <p className="text-sm font-semibold leading-tight">{c.name}</p>
            {!c.exclusive && <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: RARITY_COLOR[rarity] }}>{rarity}</p>}
            {have ? (
              <Button variant={equipped ? 'primary' : 'ghost'} className="w-full justify-center py-1.5" onClick={() => equip(c)}>
                {equipped ? <span className="flex items-center gap-1"><Check size={14} /> {c.type === 'theme' ? 'Active' : 'Equipped'}</span> : (c.type === 'theme' ? 'Apply' : 'Equip')}
              </Button>
            ) : c.exclusive ? (
              <div className="rounded-xl border border-dashed border-accent-2/60 px-2 py-1.5">
                <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent-2"><Lock size={10} /> achievement</p>
                <p className="text-[10px] leading-tight text-muted">{c.earnedBy}</p>
              </div>
            ) : (
              <Button variant="outline" className="w-full justify-center py-1.5" disabled={coins < c.price} onClick={() => buy(c)}>🪙 {c.price}</Button>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function PowerUps() {
  const coins = useGami((s) => s.coins);
  const spend = useGami((s) => s.spendCoins);
  const rerolls = useGami((s) => s.rerolls);
  const buyReroll = useGami((s) => s.buyReroll);
  const buyFreeze = useGami((s) => s.buyStreakFreeze);
  const navigate = useNavigate();
  const { owned, own, isEquipped, equip } = useEquip();
  const [won, setWon] = useState<Cosmetic | null>(null);
  const pool = chestPool(ALL_COSMETICS, owned);

  function openChest() {
    const item = pickChestItem(pool);
    if (!item) return;
    if (!spend(CHEST_PRICE)) { haptic('warning'); toast(`Not enough coins: need 🪙${CHEST_PRICE}.`, 'error'); return; }
    own(item.id);
    haptic('success');
    setWon(item);
    setTimeout(celebrate, 250);
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3 text-center border-accent-2/50">
        <p className="text-5xl">🎁</p>
        <div>
          <p className="text-lg font-extrabold">Mystery Chest</p>
          <p className="text-xs text-muted">One random title, badge, frame, confetti or theme you don't own yet. Never a duplicate. Legendary pulls are rare, and some are worth far more than 🪙{CHEST_PRICE}.</p>
        </div>
        {pool.length ? (
          <Button className="w-full justify-center py-3 text-base" disabled={coins < CHEST_PRICE} onClick={openChest}>Open for 🪙{CHEST_PRICE}</Button>
        ) : (
          <p className="text-sm font-semibold text-accent-2">You own everything the chest can give. Legend.</p>
        )}
      </Card>

      <Card className="flex items-center gap-3">
        <p className="text-3xl">🎲</p>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Quest Reroll {rerolls > 0 && <span className="text-accent">· {rerolls} ready</span>}</p>
          <p className="text-[11px] text-muted">Don't like a daily quest? Swap it for a different one on the Quests tab.</p>
        </div>
        <Button variant="outline" className="py-1.5 shrink-0" disabled={coins < REROLL_PRICE} onClick={() => { if (buyReroll()) { haptic('success'); toast('Reroll ready: tap 🎲 on a daily quest'); } }}>🪙 {REROLL_PRICE}</Button>
      </Card>

      <Card className="flex items-center gap-3">
        <p className="text-3xl">🧊</p>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Streak Freeze</p>
          <p className="text-[11px] text-muted">Protects your day streak for one missed day.</p>
        </div>
        <Button variant="outline" className="py-1.5 shrink-0" disabled={coins < FREEZE_PRICE} onClick={() => { if (buyFreeze()) { haptic('success'); toast('Streak freeze bought 🧊'); } }}>🪙 {FREEZE_PRICE}</Button>
      </Card>

      <Sheet open={won !== null} onClose={() => setWon(null)} title="You got…">
        {won && (
          <div className="space-y-3 pt-1 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: RARITY_COLOR[rarityOf(won.price)] }}>{rarityOf(won.price)} {won.type}</p>
            <Preview c={won} />
            <p className="text-xl font-extrabold">{won.name}</p>
            <p className="text-xs text-muted">Worth 🪙{won.price} in the shop.</p>
            {!isEquipped(won) && (
              <Button className="w-full justify-center py-3" onClick={() => { equip(won); setWon(null); }}>{won.type === 'theme' ? 'Apply now' : 'Equip now'}</Button>
            )}
            <Button variant="ghost" className="w-full justify-center" onClick={() => { setWon(null); if (won.type === 'title' || won.type === 'badge' || won.type === 'frame') navigate('/profile'); }}>
              {won.type === 'title' || won.type === 'badge' || won.type === 'frame' ? 'See it on your profile' : 'Nice'}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
