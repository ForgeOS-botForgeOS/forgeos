// Clickjacking guard for a statically hosted app.
//
// The textbook answer is `X-Frame-Options` or CSP `frame-ancestors`, and both
// need a response header. GitHub Pages sends neither and a <meta> CSP is
// explicitly ignored for frame-ancestors, so the only place this check can live
// is in the page itself — before the UI renders, because the whole attack is
// getting someone to click a real control they cannot see.

/** Minimal shape of the window we need, so this is testable without a DOM. */
export interface FrameWindow {
  self: unknown;
  top: unknown;
  location: { href: string };
  document?: {
    // Loose on purpose: this must accept the real `window` and a plain object
    // in tests without dragging the DOM lib into the signature.
    body?: { textContent: string | null; appendChild?: (node: never) => unknown } | null;
    createElement?: (tag: never) => Record<string, unknown>;
  } | null;
}

/**
 * Returns true when it is safe to render.
 *
 * When the page *is* framed it says so in plain text instead of rendering, and
 * tries to break out. Breaking out can be refused (a cross-origin top frame
 * without a user gesture), which is exactly why the refusal to render is the
 * real defence and the escape is only a nicety.
 */
export function refuseToBeFramed(win: FrameWindow): boolean {
  let framed: boolean;
  try {
    framed = win.self !== win.top;
  } catch {
    // Reading window.top across origins can throw — and only a cross-origin
    // frame can make it throw, so throwing *is* the answer.
    framed = true;
  }
  if (!framed) return true;

  const doc = win.document;
  const body = doc?.body;
  if (body) {
    // Built with DOM nodes and textContent — never an HTML string. The app's own
    // security test forbids `innerHTML` anywhere in src/, and a guard that
    // breaks the rule it exists to protect is not much of a guard.
    body.textContent = 'ForgeOS will not run inside another site. ';
    const link = doc?.createElement?.('a' as never);
    if (link && body.appendChild) {
      link.href = 'https://forgeos-botforgeos.github.io/forgeos/';
      link.textContent = 'Open ForgeOS directly';
      body.appendChild(link as never);
    }
  }
  try {
    // The escape: point the TOP window at us. Browsers refuse this from a
    // cross-origin frame without a user gesture — fine, the refusal to render
    // above is the actual defence; this only tidies up when it is allowed.
    (win.top as { location?: { replace?: (url: string) => void } })?.location?.replace?.(win.location.href);
  } catch {
    /* blocked by the parent's origin — nothing lost */
  }
  return false;
}
