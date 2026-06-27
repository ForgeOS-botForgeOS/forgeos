import { Card, Ring, Badge } from './ui';
import type { Readiness } from '../lib/readiness';

// Shared recovery widgets so Home, Train and Health show the same readiness
// signal in different sizes.

/** Big hero block for the Health screen. */
export function ReadinessHero({ r }: { r: Readiness }) {
  return (
    <Card className="flex items-center gap-4" style={{ borderColor: r.color }}>
      <Ring value={r.score} max={100} size={92} stroke={10} color={r.color}>
        <span className="text-2xl font-bold font-mono leading-none">{r.score}</span>
        <span className="text-[10px] text-muted">/100</span>
      </Ring>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-extrabold" style={{ color: r.color }}>{r.emoji} {r.label}</p>
        <p className="text-[12px] text-muted">{r.advice}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {r.factors.map((f, i) => <span key={i} className="text-[10px] text-muted bg-surface-2 rounded-full px-2 py-0.5">{f}</span>)}
        </div>
      </div>
    </Card>
  );
}

/** Dashboard card (Home) — tappable, opens the Health screen. */
export function ReadinessCard({ r, onClick }: { r: Readiness; onClick?: () => void }) {
  return (
    <Card onClick={onClick} className="flex items-center gap-3" style={{ borderColor: r.color }}>
      <Ring value={r.score} max={100} size={56} stroke={7} color={r.color}>
        <span className="text-sm font-bold font-mono">{r.score}</span>
      </Ring>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ color: r.color }}>{r.emoji} {r.label}</span>
          <span className="text-[11px] text-muted">recovery</span>
        </div>
        <p className="text-[12px] text-muted truncate">{r.advice}</p>
      </div>
      <Badge color={r.color}>Open</Badge>
    </Card>
  );
}

/** Inline pill (Train) — compact tier chip. */
export function ReadinessChip({ r }: { r: Readiness }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: 'rgb(var(--surface-2))', color: r.color }}>
      {r.emoji} {r.label} · {r.score}
    </span>
  );
}
