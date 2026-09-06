import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Accessibility guards that fail the build, not a checklist somebody remembers.
//
// These are deliberately crude source scans rather than rendered-DOM tests: the
// failures they catch (an icon button with no name, a switch that announces as
// "button", a dialog with no host) are all visible in the source, and a scan
// runs on every file including the ones nobody wrote a test for.

const SRC = join(__dirname, '..');

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const FILES = tsxFiles(SRC).map((path) => ({ path: path.slice(SRC.length + 1), src: readFileSync(path, 'utf8') }));

describe('every control can be announced', () => {
  it('has no icon-only button without an accessible name', () => {
    const offenders: string[] = [];
    for (const { path, src } of FILES) {
      for (const m of src.matchAll(/<(motion\.button|button)\b(.*?)>(.*?)<\/\1>/gs)) {
        const [, , attrs, body] = m;
        if (/aria-label|aria-labelledby/.test(attrs)) continue;
        // Any real word outside a tag is a visible label.
        if (/[A-Za-zÀ-ſ]{2,}/.test(body.replace(/<[^>]*>/g, ' '))) continue;
        if (!/<[A-Z]|<motion\./.test(body)) continue; // renders no icon at all
        offenders.push(`${path}: ${body.replace(/\s+/g, ' ').trim().slice(0, 60)}`);
      }
    }
    expect(offenders, 'give these buttons an aria-label').toEqual([]);
  });

  it('renders every Toggle as a switch with a label', () => {
    const ui = FILES.find((f) => f.path === 'components/ui.tsx')!.src;
    expect(ui).toContain('role="switch"');
    expect(ui).toContain('aria-checked={checked}');
    // The prop is required in TypeScript; this catches it being made optional.
    expect(ui).toMatch(/label: string.*\}\) \{/s);
  });

  it('marks decorative icons in the shared list row as hidden', () => {
    const row = FILES.find((f) => f.path === 'components/ActionList.tsx')!.src;
    expect(row.match(/aria-hidden="true"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe('dialogs behave like dialogs', () => {
  it('mounts the dialog host, so no askConfirm/askText can hang unanswered', () => {
    const app = FILES.find((f) => f.path === 'App.tsx')!.src;
    expect(app).toContain('<DialogHost />');
  });

  it('gives both the sheet and the modal dialog semantics', () => {
    const ui = FILES.find((f) => f.path === 'components/ui.tsx')!.src;
    const dialog = FILES.find((f) => f.path === 'components/DialogHost.tsx')!.src;
    for (const src of [ui, dialog]) {
      expect(src).toContain('role="dialog"');
      expect(src).toContain('aria-modal="true"');
    }
    expect(dialog).toContain('aria-labelledby');
  });

  it('lets Escape out of both of them', () => {
    const ui = FILES.find((f) => f.path === 'components/ui.tsx')!.src;
    const dialog = FILES.find((f) => f.path === 'components/DialogHost.tsx')!.src;
    for (const src of [ui, dialog]) expect(src).toMatch(/e\.key [!=]== 'Escape'/);
  });
});

describe('no native browser dialogs', () => {
  // A native prompt renders as 'The page at "https://…" says:', cannot be
  // styled or translated, and some Android WebViews suppress it outright —
  // which silently kills whatever feature sits behind it.
  it('never calls window.alert, confirm or prompt', () => {
    const all = [...FILES, ...['lib', 'state'].flatMap((d) =>
      readdirSync(join(SRC, d))
        .filter((f) => f.endsWith('.ts') && !f.includes('.test.'))
        .map((f) => ({ path: `${d}/${f}`, src: readFileSync(join(SRC, d, f), 'utf8') })),
    )];
    const offenders: string[] = [];
    for (const { path, src } of all) {
      // Strip comments first — a mention in prose is not a call.
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      if (/(?<![.\w])(window\.)?(alert|confirm|prompt)\s*\(/.test(code)) offenders.push(path);
    }
    expect(offenders, 'use lib/dialog.ts (askConfirm / askText) instead').toEqual([]);
  });
});
