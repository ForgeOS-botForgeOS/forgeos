import type { WrapArchetype } from '../../lib/workoutWrap';

// Per-archetype emoji and background pattern for the workout Wrap.
export const ARCH_EMOJI: Record<WrapArchetype, string> = {
  firstEver: '🌱',
  pr: '🏆',
  comeback: '🔥',
  heavy: '🦍',
  volume: '🚂',
  marathon: '⏳',
  quick: '⚡',
  balanced: '🧱',
  cardioFar: '🛣️',
  cardioFast: '🏎️',
  cardioSteady: '🫀',
  watch: '⌚',
};

const W = 'rgba(255,255,255,0.07)';
export const ARCH_PATTERN: Record<WrapArchetype, string> = {
  firstEver: `radial-gradient(${W} 1.5px, transparent 1.5px)`,
  pr: `repeating-conic-gradient(from 0deg at 50% 30%, ${W} 0deg 6deg, transparent 6deg 18deg)`,
  comeback: `radial-gradient(circle at 50% 110%, rgba(255,255,255,0.18), transparent 60%)`,
  heavy: `repeating-linear-gradient(135deg, ${W} 0 14px, transparent 14px 34px)`,
  volume: `radial-gradient(${W} 2px, transparent 2px)`,
  marathon: `repeating-radial-gradient(circle at 50% 40%, ${W} 0 2px, transparent 2px 28px)`,
  quick: `repeating-linear-gradient(0deg, ${W} 0 2px, transparent 2px 22px)`,
  balanced: `linear-gradient(${W} 1px, transparent 1px), linear-gradient(90deg, ${W} 1px, transparent 1px)`,
  cardioFar: `repeating-linear-gradient(100deg, ${W} 0 3px, transparent 3px 40px)`,
  cardioFast: `repeating-linear-gradient(90deg, ${W} 0 40px, transparent 40px 90px)`,
  cardioSteady: `repeating-radial-gradient(circle at 50% 50%, ${W} 0 3px, transparent 3px 36px)`,
  watch: `repeating-conic-gradient(from 0deg at 50% 45%, ${W} 0deg 1deg, transparent 1deg 30deg)`,
};
export const PATTERN_SIZE: Partial<Record<WrapArchetype, string>> = {
  firstEver: '26px 26px',
  volume: '18px 18px',
  balanced: '44px 44px',
};

export function formatPace(sec?: number): string {
  if (!sec) return '–';
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

