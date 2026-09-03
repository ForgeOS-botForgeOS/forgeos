import { describe, expect, it, vi } from 'vitest';
import { refuseToBeFramed, type FrameWindow } from './frameGuard';

function win(over: Partial<FrameWindow> = {}): FrameWindow {
  const self = { name: 'self' };
  return {
    self,
    top: self, // not framed by default
    location: { href: 'https://forgeos.example/app' },
    document: {
      body: { textContent: 'app', appendChild: (n: unknown) => n },
      createElement: () => ({}) as Record<string, unknown>,
    },
    ...over,
  };
}

describe('refuseToBeFramed', () => {
  it('renders normally when the page is the top document', () => {
    const w = win();
    expect(refuseToBeFramed(w)).toBe(true);
    expect(w.document?.body?.textContent).toBe('app');
  });

  it('refuses to render inside an iframe, and says why', () => {
    const w = win({ top: { other: true } });
    expect(refuseToBeFramed(w)).toBe(false);
    expect(w.document?.body?.textContent).toContain('will not run inside another site');
  });

  it('treats a cross-origin window.top (which throws on read) as framed', () => {
    const w = win();
    Object.defineProperty(w, 'top', { get() { throw new DOMException('blocked'); } });
    expect(refuseToBeFramed(w)).toBe(false);
  });

  it('tries to break out to the top window when it is allowed to', () => {
    const replace = vi.fn();
    const w = win({ top: { location: { replace } } });
    refuseToBeFramed(w);
    expect(replace).toHaveBeenCalledWith('https://forgeos.example/app');
  });

  it('still refuses to render when the break-out is blocked', () => {
    const w = win({ top: { location: { replace: () => { throw new Error('cross-origin'); } } } });
    expect(refuseToBeFramed(w)).toBe(false);
  });
});
