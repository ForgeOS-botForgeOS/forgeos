import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

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

type BtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'> & {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger';
};
const PRESS = { type: 'spring' as const, stiffness: 500, damping: 30 };
export function Button({ variant = 'primary', className = '', children, ...rest }: BtnProps) {
  const styles: Record<string, string> = {
    primary: 'bg-accent text-black font-semibold hover:brightness-110',
    ghost: 'bg-surface-2 text-text hover:bg-line',
    outline: 'border border-line text-text hover:bg-surface-2',
    danger: 'bg-danger text-black font-semibold hover:brightness-110',
  };
  return (
    <motion.button
      whileTap={rest.disabled ? undefined : { scale: 0.95 }}
      transition={PRESS}
      className={`rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function Pill({ children, active = false, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={PRESS}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-accent text-black' : 'bg-surface-2 text-muted hover:text-text'
      }`}
    >
      {children}
    </motion.button>
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
  // Swipe-to-dismiss is driven only from the grab handle/header (via drag
  // controls) so the body can scroll freely — putting `drag` on the scroll
  // container itself swallows vertical scrolling.
  const dragControls = useDragControls();
  // Portal to the phone root so the sheet always covers the FULL frame. Screen
  // wrappers animate `y` (a CSS transform), which would otherwise trap this
  // `absolute` sheet inside the screen's (often short) box and cut it off.
  const root = (typeof document !== 'undefined' && document.getElementById('phone-root')) || null;
  const tree = (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120) onClose(); }}
            className="relative flex max-h-[85%] w-full flex-col rounded-t-2xl bg-surface border-t border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="shrink-0 cursor-grab touch-none px-5 pt-3 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
              {title && <h3 className="text-lg font-bold">{title}</h3>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-8 pt-3">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  return root ? createPortal(tree, root) : tree;
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.button
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.9 }}
      transition={PRESS}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-surface-2'}`}
    >
      <motion.span
        layout
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow"
      />
    </motion.button>
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
