import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Guard: every screen route must live inside a shell that provides scrolling
// (AppShell's <main> or PublicShell). A route declared directly under <Routes>
// renders inside PhoneFrame's overflow-hidden box and clips on phones — this
// exact bug shipped once on /download and /add-friend (fixed 2026-07-17).

const appSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'App.tsx'), 'utf8');

describe('route layout safety', () => {
  test('no screen route sits directly under <Routes> (it would render unscrollable)', () => {
    const routesBlock = appSource.slice(appSource.indexOf('<Routes>'), appSource.indexOf('</Routes>'));
    expect(routesBlock.length).toBeGreaterThan(0);

    let depth = 0;
    const offenders: string[] = [];
    for (const raw of routesBlock.split('\n')) {
      const line = raw.trim();
      if (line.startsWith('<Route')) {
        const selfClosing = line.endsWith('/>');
        if (depth === 0 && selfClosing) {
          // Only the catch-all redirect may sit at the top level — it renders
          // a <Navigate>, not a screen.
          if (!line.includes('path="*"')) offenders.push(line);
        }
        if (!selfClosing) depth += 1;
      } else if (line.startsWith('</Route>')) {
        depth -= 1;
      }
    }

    expect(offenders, `These routes render outside AppShell/PublicShell and will clip on phones:\n${offenders.join('\n')}\nNest them under PublicShell (public pages) or the RequireOnboarding/AppShell block.`).toEqual([]);
  });

  test('the public shell wrapper exists and owns scrolling', () => {
    expect(appSource).toContain('function PublicShell()');
    expect(appSource).toMatch(/PublicShell\(\)\s*{\s*return\s*\(\s*<div className="h-full overflow-y-auto/);
  });
});
