// Building blocks shared by every trailer scene. All of them are pure
// functions of `time` (seconds on the trailer timeline): no state, no effects.
import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { burst, easeOutBack, kf, prog, sweep, type BurstOptions } from '../../lib/promo/motion';
import { GOLD, HEAT, TEAL, fitDisplay } from './kit';

// ---- Typography ---------------------------------------------------------

interface HeadlineProps {
  time: number;
  start: number;
  kicker: string;
  lines: readonly [string, string];
  accent?: string;
  top?: number;
  size?: number;
}

/** Chapter kicker plus a two-line headline wiping up out of a mask, with Tempo's skewed signal bar. */
export function Headline({ time, start, kicker, lines, accent = TEAL, top = 62, size = 46 }: HeadlineProps) {
  const fs = Math.min(fitDisplay(lines[0], size, 316), fitDisplay(lines[1], size, 316));
  const pk = sweep(prog(time, start, 0.35));
  const p1 = sweep(prog(time, start + 0.04, 0.42));
  const p2 = sweep(prog(time, start + 0.12, 0.42));
  const bar = sweep(prog(time, start + 0.22, 0.4));
  return (
    <div className="promo-abs" style={{ left: 22, top }}>
      <div className="promo-label" style={{ color: accent, opacity: pk, transform: `translateX(${(1 - pk) * -14}px)`, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 6, height: 6, background: accent, display: 'inline-block' }} />
        {kicker}
      </div>
      <div className="promo-mask" style={{ marginTop: 8 }}>
        <div className="promo-display" style={{ fontSize: fs, transform: `translateY(${(1 - p1) * 108}%)` }}>{lines[0]}</div>
      </div>
      <div className="promo-mask">
        <div className="promo-display" style={{ fontSize: fs, color: accent, transform: `translateY(${(1 - p2) * 108}%)` }}>{lines[1]}</div>
      </div>
      <div style={{ marginTop: 9, width: 46, height: 5, background: accent, transformOrigin: '0 50%', transform: `skewX(-20deg) scaleX(${bar})` }} />
    </div>
  );
}


// ---- Floating UI --------------------------------------------------------

interface ChipProps {
  time: number;
  start: number;
  /** Distance from the left edge, or from the right edge when `fromRight` is set (long labels then grow leftwards). */
  x: number;
  y: number;
  icon: LucideIcon;
  label: string;
  tone?: string;
  fromRight?: boolean;
}

/** A feature callout that wipes in on its beat and floats beside the device. */
export function Chip({ time, start, x, y, icon: Icon, label, tone = TEAL, fromRight = false }: ChipProps) {
  if (time < start) return null;
  const p = sweep(prog(time, start, 0.32));
  const float = Math.sin((time - start) * 2.4 + x * 0.05 + y * 0.03) * 2;
  const hidden = `${(1 - p) * 100}%`;
  return (
    <div
      className="promo-chip"
      style={{
        ...(fromRight ? { right: x } : { left: x }),
        top: y,
        borderLeftColor: tone,
        opacity: Math.min(1, p * 1.8),
        clipPath: fromRight ? `inset(-20px -20px -20px ${hidden})` : `inset(-20px ${hidden} -20px -20px)`,
        transform: `translate(${(1 - p) * (fromRight ? 12 : -12)}px, ${float}px)`,
      }}
    >
      <Icon size={13} color={tone} strokeWidth={2.4} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

interface StampProps {
  time: number;
  start: number;
  x: number;
  y: number;
  color: string;
  children: ReactNode;
  rotate?: number;
}

/** A label that slams onto the frame ("NEW PR", "RANK UP", "YOU WIN"). */
export function Stamp({ time, start, x, y, color, children, rotate = -7 }: StampProps) {
  if (time < start) return null;
  const s = kf(time - start, [[0, 2.4], [0.2, 1, easeOutBack(1.8)]]);
  const o = Math.min(1, (time - start) / 0.06);
  return (
    <div
      className="promo-abs promo-display"
      style={{
        left: x,
        top: y,
        padding: '6px 10px 5px',
        border: `2px solid ${color}`,
        borderRadius: 4,
        color,
        background: 'rgb(14 17 22 / 0.88)',
        fontSize: 20,
        opacity: o,
        transform: `rotate(${rotate}deg) scale(${s})`,
        boxShadow: `0 0 24px ${color}55`,
      }}
    >
      {children}
    </div>
  );
}

interface PhoneProps {
  x: number;
  y: number;
  ry?: number;
  rx?: number;
  scale?: number;
  opacity?: number;
  glow?: string;
  children?: ReactNode;
}

/** A phone in perspective. Its screen holds an illustrated slice of the real app. */
export function Phone({ x, y, ry = 0, rx = 0, scale = 1, opacity = 1, glow = TEAL, children }: PhoneProps) {
  return (
    <>
      <div
        className="promo-abs"
        style={{
          left: x - 40,
          top: y + 300,
          width: 264,
          height: 120,
          opacity: opacity * 0.55,
          background: `radial-gradient(50% 50% at 50% 50%, ${glow}55, transparent 70%)`,
        }}
      />
      <div className="promo-phone" style={{ left: x, top: y, opacity, transform: `perspective(900px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${scale})` }}>
        <div className="promo-notch" />
        {children}
        <div className="promo-sheen" />
      </div>
    </>
  );
}

// ---- Effects ------------------------------------------------------------

interface SparksProps {
  time: number;
  start: number;
  x: number;
  y: number;
  opts: BurstOptions;
  colors?: readonly string[];
}

/** Sparks off an impact, drawn as streaks along their direction of travel. */
export function Sparks({ time, start, x, y, opts, colors = [HEAT, GOLD, '#ffffff'] }: SparksProps) {
  const ps = burst(time, start, opts);
  if (!ps.length) return null;
  return (
    <svg className="promo-abs" width={360} height={640} style={{ overflow: 'visible', pointerEvents: 'none' }} aria-hidden="true">
      {ps.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x1 = x + p.x;
        const y1 = y + p.y;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x1 - Math.cos(rad) * p.len}
            y2={y1 - Math.sin(rad) * p.len}
            stroke={colors[Math.min(colors.length - 1, Math.floor(p.hue * colors.length))]}
            strokeWidth={1.8}
            strokeLinecap="round"
            opacity={p.alpha}
          />
        );
      })}
    </svg>
  );
}

/** An expanding ring off an impact. */
export function Shockwave({ time, start, x, y, color = TEAL, size = 520 }: { time: number; start: number; x: number; y: number; color?: string; size?: number }) {
  const p = prog(time, start, 0.6);
  if (time < start || p >= 1) return null;
  const s = 0.15 + 0.85 * sweep(p);
  return (
    <div
      className="promo-abs"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        opacity: (1 - p) * 0.9,
        transform: `scale(${s})`,
      }}
    />
  );
}

// ---- Data viz -----------------------------------------------------------

/** A circular progress ring (stroke-dashoffset), starting at 12 o'clock. */
export function Ring({ size, stroke, p, color, track = '#1e2530' }: { size: number; stroke: number; p: number; color: string; track?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0.001, p))}
      />
    </svg>
  );
}

/** Tempo's segmented meter with a bright leading needle. */
export function Meter({ p, width, color, segments = 24, height = 10 }: { p: number; width: number; color: string; segments?: number; height?: number }) {
  const filled = p * segments;
  return (
    <div style={{ display: 'flex', gap: 2, width }}>
      {Array.from({ length: segments }, (_, i) => {
        const lead = i === Math.floor(filled) && filled < segments;
        const on = i < filled;
        const style: CSSProperties = {
          flex: 1,
          height,
          borderRadius: 1,
          background: lead ? '#ffffff' : on ? color : '#1e2530',
          opacity: lead ? Math.max(0.35, filled - i) : 1,
        };
        return <div key={i} style={style} />;
      })}
    </div>
  );
}
