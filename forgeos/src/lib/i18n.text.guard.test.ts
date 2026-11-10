import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SK_TEXT } from './i18n.text.sk';

// Strings translated by their English text — t('Finish workout') — need no
// English entry, so nothing but this test notices when the Slovak one is
// missing. It reads every t('…') in the source and checks the dictionary.

const SRC = join(__dirname, '..');
const DOTTED_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)+$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

function textKeys(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(?<![\w.])(?:t|tr)\(\s*'((?:[^'\\]|\\.)+)'/g)) out.push(m[1].replace(/\\'/g, "'"));
  for (const m of source.matchAll(/(?<![\w.])(?:t|tr)\(\s*"((?:[^"\\]|\\.)+)"/g)) out.push(m[1]);
  return out.filter((k) => !DOTTED_KEY.test(k));
}

describe('Slovak text dictionary', () => {
  it('has an entry for every t(\'English text\') in the app', () => {
    const missing = new Set<string>();
    for (const file of sourceFiles(SRC)) {
      // Comments quote t('…') as an example; only code counts.
      const code = readFileSync(file, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
      for (const key of textKeys(code)) {
        if (!(key in SK_TEXT)) missing.add(key);
      }
    }
    expect([...missing].sort()).toEqual([]);
  });

  it('keeps every {placeholder} of the English text', () => {
    const broken = Object.entries(SK_TEXT).filter(([en, sk]) => {
      const want = [...en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
      const got = [...sk.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
      return want !== got;
    });
    expect(broken).toEqual([]);
  });
});
