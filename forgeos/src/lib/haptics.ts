// Haptic feedback via the Vibration API, with a global enable flag.
let enabled = true;
export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

type Pattern = 'tap' | 'success' | 'warning' | 'heavy' | 'rest-done';

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 10,
  success: [20, 40, 30],
  warning: [40, 60, 40],
  heavy: 60,
  'rest-done': [80, 50, 80, 50, 120],
};

export function haptic(pattern: Pattern = 'tap') {
  if (!enabled) return;
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(PATTERNS[pattern]);
    } catch {
      /* vibration not permitted — silent fallback */
    }
  }
}
