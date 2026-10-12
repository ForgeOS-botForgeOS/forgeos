// Grip position — a set's sub-target, like TUT or a band colour.
//
// One list of hand positions people actually write in a training log: the
// direction the palms face (overhand / underhand / neutral / mixed), the grip
// style (hook, thumbless) and the width on the bar (wide / close). A set holds
// one of them; the row carries it to the next set so a whole wide-grip block
// is one tap, not five.

export const GRIP_POSITIONS = ['overhand', 'underhand', 'neutral', 'mixed', 'hook', 'thumbless', 'wide', 'close'] as const;

export type GripPosition = (typeof GRIP_POSITIONS)[number];

export const GRIP_LABEL: Record<GripPosition, string> = {
  overhand: 'Overhand',
  underhand: 'Underhand',
  neutral: 'Neutral',
  mixed: 'Mixed',
  hook: 'Hook',
  thumbless: 'Thumbless',
  wide: 'Wide',
  close: 'Close',
};

/** What each grip means, for the picker's hint line. */
export const GRIP_HINT: Record<GripPosition, string> = {
  overhand: 'Palms down / facing away (pronated)',
  underhand: 'Palms up / facing you (supinated)',
  neutral: 'Palms facing each other (hammer)',
  mixed: 'One palm over, one under',
  hook: 'Thumb wrapped under the fingers',
  thumbless: 'Thumb on the same side as the fingers',
  wide: 'Hands wider than shoulders',
  close: 'Hands inside shoulder width',
};

/** Anything from outside (a share link, an old backup) becomes a known grip or nothing. */
export function coerceGrip(v: unknown): GripPosition | undefined {
  return typeof v === 'string' && (GRIP_POSITIONS as readonly string[]).includes(v) ? (v as GripPosition) : undefined;
}
