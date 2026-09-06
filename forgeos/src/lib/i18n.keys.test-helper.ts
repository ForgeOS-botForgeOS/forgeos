import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The i18n dictionaries are plain object literals, so a test can read the keys
// straight out of the source. Importing lib/i18n.ts instead would drag in the
// settings store (and therefore localStorage) for no reason.
function keysIn(block: string): Set<string> {
  return new Set([...block.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));
}

const SOURCE = readFileSync(join(__dirname, 'i18n.ts'), 'utf8');
const EN_START = SOURCE.indexOf('const EN: Dict = {');
const SK_START = SOURCE.indexOf('const SK: Dict = {');

export const EN_KEYS = keysIn(SOURCE.slice(EN_START, SK_START));
export const SK_KEYS = keysIn(SOURCE.slice(SK_START));
