// Text that came from somewhere else, on its way to a screen.
//
// React already escapes everything it renders, so this is not about `<script>`
// tags — that hole does not exist here and a test guards it. It is about the
// other three ways displayed text goes wrong:
//
//   1. **Invisible characters.** U+202E (RIGHT-TO-LEFT OVERRIDE) reverses
//      everything after it, so a friend can name themselves in a way that reads
//      as somebody else's name; zero-width spaces let two different people
//      display as the same name; a lone \r can blank a line in some renderers.
//   2. **Layout.** A 40,000-character "name" or 200 newlines does not break
//      security, it breaks the screen — which for a phone app is the same kind
//      of denial of service.
//   3. **Links.** `javascript:` and `data:` in an href execute; only a few
//      schemes are ever safe to hand to a browser.
//
// Applied where data *enters* the app (remote rows, realtime broadcasts,
// third-party APIs, imported files, share links), not at every render site:
// one boundary is auditable, forty render sites are not.

/**
 * Characters that are invisible or that change how the text around them reads:
 * zero-width, bidi overrides/isolates, byte-order mark, and the C0/C1 control
 * blocks (newline and tab are handled separately, by `multiline`).
 */
const INVISIBLE = new RegExp(
  '[' +
  '\u200B-\u200F' + // zero-width space/non-joiner/joiner + LRM/RLM
  '\u202A-\u202E' + // bidi embeddings and the RIGHT-TO-LEFT OVERRIDE
  '\u2060-\u2064' + // word joiner and invisible maths operators
  '\u2066-\u2069' + // bidi isolates
  '\uFEFF' +         // byte-order mark
  ']',
  'g',
);
/**
 * C0 and C1 control characters. `\n` and `\t` are deliberately left in and
 * handled by `multiline`.
 *
 * eslint's no-control-regex exists to catch these by accident — matching them
 * on purpose is the entire job of this line.
 */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

export interface CleanOpts {
  /** Hard cap, in characters. Anything longer is cut (no ellipsis — callers decide). */
  max?: number;
  /** Keep newlines (a post) or flatten to one line (a name). */
  multiline?: boolean;
}

/** The one function everything else here is built from. */
export function cleanText(input: unknown, { max = 500, multiline = false }: CleanOpts = {}): string {
  let s = typeof input === 'string' ? input : input == null ? '' : String(input);
  // Normalise first: composed and decomposed forms of the same name should not
  // be two different names, and normalising after stripping can re-introduce
  // characters we just removed.
  try {
    s = s.normalize('NFC');
  } catch {
    /* an environment without full Unicode support — the rest still applies */
  }
  s = s.replace(INVISIBLE, '').replace(CONTROL, '');
  s = multiline
    ? s.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[^\S\n]{2,}/g, ' ')
    : s.replace(/\s+/g, ' ');
  return s.trim().slice(0, max);
}

/** Limits chosen to fit the UI, not to be generous. */
export const LIMITS = {
  name: 32,
  title: 80,
  post: 1000,
  comment: 500,
  note: 500,
  product: 120,
} as const;

/**
 * A person's display name, from anywhere.
 *
 * Falls back rather than rendering an empty element, because a name that
 * cleans down to nothing is exactly what an impersonation attempt looks like.
 */
export function displayName(input: unknown, fallback = 'Athlete'): string {
  return cleanText(input, { max: LIMITS.name }) || fallback;
}

/** A product/exercise/food name from a third-party API or an imported file. */
export function displayTitle(input: unknown, fallback = ''): string {
  return cleanText(input, { max: LIMITS.product }) || fallback;
}

/** Body text people write: keeps paragraphs, loses everything invisible. */
export function displayBody(input: unknown, max: number = LIMITS.post): string {
  return cleanText(input, { max, multiline: true });
}

/**
 * A URL that is safe to put in an `href`, `src` or `window.open`.
 *
 * Allowlist, not denylist: `javascript:`, `data:`, `blob:` and `vbscript:` all
 * execute or embed, and a denylist misses the next one. Returns undefined when
 * the URL is not usable, so the caller renders no link at all.
 */
export function safeUrl(input: unknown): string | undefined {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return undefined;
  try {
    const url = new URL(raw, typeof location !== 'undefined' ? location.href : 'https://forgeos.invalid');
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
