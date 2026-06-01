import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Coins, Check } from 'lucide-react';
import { Card, Button, Pill, Badge } from '../components/ui';
import { COSMETICS } from '../data/cosmetics';
import { useCosmetics } from '../state/cosmeticsStore';
import { useGami } from '../state/gamificationStore';
import { haptic } from '../lib/haptics';

export default function Shop() {
  const navigate = useNavigate();
  const coins = useGami((s) => s.coins);
  const spend = useGami((s) => s.spendCoins);
  const { owned, own, equippedTitle, equippedFrame, equipTitle, equipFrame } = useCosmetics();
  const [tab, setTab] = useState<'title' | 'frame'>('title');

  const list = COSMETICS.filter((c) => c.type === tab);

  function buy(id: string, price: number) {
    if (owned.includes(id)) return;
    if (spend(price)) { own(id); haptic('success'); } else haptic('warning');
  }
  function equip(id: string, type: 'title' | 'frame') {
    const equipped = type === 'title' ? equippedTitle : equippedFrame;
    const fn = type === 'title' ? equipTitle : equipFrame;
    fn(equipped === id ? null : id); // toggle off if already equipped
    haptic('tap');
  }

  return (
    <div className="px-4 pt-12 pb-8 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-extrabold">Forge Shop</h1>
        <Badge color="rgb(var(--accent-2))"><span className="flex items-center gap-1"><Coins size={12} /> {coins}</span></Badge>
      </div>

      <div className="flex gap-2" data-noswipe>
        <Pill active={tab === 'title'} onClick={() => setTab('title')}>Titles</Pill>
        <Pill active={tab === 'frame'} onClick={() => setTab('frame')}>Avatar frames</Pill>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {list.map((c) => {
          const have = owned.includes(c.id);
          const equipped = (c.type === 'title' ? equippedTitle : equippedFrame) === c.id;
          return (
            <Card key={c.id} className="space-y-2 text-center">
              {c.type === 'frame' ? (
                <div className="mx-auto w-12 h-12 rounded-full p-[3px]" style={{ background: c.value }}>
                  <div className="w-full h-full rounded-full bg-surface flex items-center justify-center text-xs font-bold text-accent">ME</div>
                </div>
              ) : (
                <p className="text-sm font-bold text-accent-2 py-2">“{c.value}”</p>
              )}
              <p className="text-sm font-semibold">{c.name}</p>
              {have ? (
                <Button variant={equipped ? 'primary' : 'ghost'} className="w-full justify-center py-1.5" onClick={() => equip(c.id, c.type)}>
                  {equipped ? <span className="flex items-center gap-1"><Check size={14} /> Equipped</span> : 'Equip'}
                </Button>
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
