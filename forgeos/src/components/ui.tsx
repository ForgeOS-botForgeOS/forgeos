import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-surface border border-line p-4 animate-fade-in-up ${onClick ? 'cursor-pointer active:scale-[0.99] transition hover:border-line/80' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
};
export function Button({ variant = 'primary', className = '', children, ...rest }: BtnProps) {
  const styles: Record<string, string> = {
    primary: 'bg-accent text-black font-semibold hover:brightness-110',
    ghost: 'bg-surface-2 text-text hover:bg-line',
    outline: 'border border-line text-text hover:bg-surface-2',
    danger: 'bg-danger text-black font-semibold hover:brightness-110',
  };
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm transition active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Pill({ children, active = false, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-accent text-black' : 'bg-surface-2 text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-1">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold font-mono leading-none">{value}</span>
      <span className="text-[11px] text-muted mt-1">{label}</span>
      {sub && <span className="text-[10px] text-muted/70">{sub}</span>}
    </div>
  );
}

// Circular progress ring (calories / rank progress).
export function Ring({
  value,
  max,
  size = 120,
  stroke = 12,
  color = 'rgb(var(--accent))',
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative w-full max-h-[80%] overflow-y-auto no-scrollbar rounded-t-2xl bg-surface border-t border-line p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        {title && <h3 className="text-lg font-bold mb-3">{title}</h3>}
        {children}
      </motion.div>
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-accent' : 'bg-surface-2'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

export function Badge({ children, color = 'rgb(var(--accent))' }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {children}
    </span>
  );
}
