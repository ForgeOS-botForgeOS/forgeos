import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseHealthText } from './health';

// Security regression guards. These don't test features — they enforce
// invariants that keep the app safe, and fail the build if a future change
// quietly reopens a hole.

const SRC = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

describe('no dangerous sinks in the source tree', () => {
  const files = walk(SRC);

  it('never uses dangerouslySetInnerHTML / eval / Function / document.write', () => {
    const bad: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      if (/dangerouslySetInnerHTML|\beval\s*\(|new Function\s*\(|document\.write\s*\(|\.innerHTML\s*=/.test(s)) {
        bad.push(f);
      }
    }
    expect(bad).toEqual([]);
  });

  it('never hardcodes API keys or service-role tokens', () => {
    const bad: string[] = [];
    // Google API keys (AIza…), OpenAI-style keys, Supabase service_role JWTs.
    const secret = /AIza[0-9A-Za-z_-]{30,}|sk-[a-zA-Z0-9]{40,}|service_role/;
    for (const f of files) {
      if (secret.test(readFileSync(f, 'utf8'))) bad.push(f);
    }
    expect(bad).toEqual([]);
  });

  it('never calls an AI provider directly with a client-side key', () => {
    const bad: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      if (/generativelanguage\.googleapis\.com|api\.openai\.com|api\.anthropic\.com/.test(s)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});

describe('import pipeline resists prototype pollution', () => {
  it('drops rows whose date is a dangerous key instead of merging them', () => {
    const evil = JSON.stringify([
      { date: '__proto__', sleepMinutes: 480, polluted: true },
      { date: 'constructor', steps: 9000 },
      { date: '2026-07-01', sleepMinutes: 450 },
    ]);
    const parsed = parseHealthText(evil);
    const dates = parsed.days.map((r) => r.date);
    expect(dates).toEqual(['2026-07-01']);
    // And the parse itself must not have polluted Object.prototype.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('supabase schema keeps health data server-side gated', () => {
  const schema = readFileSync(join(SRC, '..', 'supabase', 'schema.sql'), 'utf8');

  it('profile rows are readable by their owner only', () => {
    // The last (winning) definition of "profiles read" must be owner-only.
    const idx = schema.lastIndexOf('create policy "profiles read"');
    const tail = schema.slice(idx, idx + 200);
    expect(tail).toContain('using (auth.uid() = id)');
    expect(tail).not.toContain('friendships');
  });

  it('friends read through the masked view, gated by share_activity', () => {
    expect(schema).toContain('create or replace view friend_profiles');
    expect(schema).toMatch(/case when coalesce\(p\.share_activity, true\) then coalesce\(p\.weekly_steps, 0\) else 0 end/);
    expect(schema).toContain('revoke all on friend_profiles from anon');
  });
});

describe('secrets people can guess never come from Math.random', () => {
  // Friend codes, race ids and OAuth state are all bearer tokens: anyone who
  // sees one gets in. V8's Math.random state is recoverable from a few observed
  // outputs, and these values are *meant* to be shared — which hands over the
  // observations. See lib/rand.ts.
  const risky = ['friendCode.ts', 'race.ts', 'spotify.ts', 'rand.ts'];

  /** Comments talk *about* Math.random; only code that calls it is a finding. */
  const withoutComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('uses the CSPRNG in every file that mints one', () => {
    const bad: string[] = [];
    for (const name of risky) {
      const code = withoutComments(readFileSync(join(SRC, 'lib', name), 'utf8'));
      if (/Math\.random\s*\(/.test(code)) bad.push(name);
    }
    expect(bad).toEqual([]);
  });
});

describe('the app-lock passcode never leaves the device', () => {
  it('is only ever stored hashed', () => {
    const profile = readFileSync(join(SRC, 'screens', 'Profile.tsx'), 'utf8');
    // The passcode sheet hands over the typed digits; they must be hashed
    // before they reach the settings store.
    expect(profile).toMatch(/hashPasscode\(code\)/);
    expect(profile).not.toMatch(/set\('appLock', \{ enabled: true, code \}\)/);
  });

  it('is stripped from backups', () => {
    const backup = readFileSync(join(SRC, 'lib', 'backup.ts'), 'utf8');
    expect(backup).toContain('delete parsed.state.appLock');
  });
});

describe('the Content-Security-Policy stays narrow', () => {
  const html = readFileSync(join(SRC, '..', 'index.html'), 'utf8');
  const csp = /content="([^"]*default-src[^"]*)"/.exec(html)?.[1] ?? '';

  it('exists, and still allows the barcode decoder to compile', () => {
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("'wasm-unsafe-eval'");
  });

  it('never widens connect-src / img-src back to "anywhere"', () => {
    // `connect-src https:` is the difference between an injection that can run
    // and an injection that can also send everything it read to an attacker.
    expect(csp).not.toMatch(/connect-src[^;]*\shttps:(\s|;)/);
    expect(csp).not.toMatch(/img-src[^;]*\shttps:(\s|;)/);
    expect(csp).toContain("connect-src 'self'");
  });

  it('does not allow inline or eval scripts', () => {
    expect(csp).not.toContain("'unsafe-inline' https");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
  });
});

describe('the endpoints refuse strangers rather than just omitting a header', () => {
  const worker = readFileSync(join(SRC, '..', '..', 'worker', 'src', 'trainer.js'), 'utf8');
  const vercel = readFileSync(join(SRC, '..', '..', 'vercel-trainer', 'api', 'trainer.js'), 'utf8');

  it('rejects a non-allowlisted Origin outright', () => {
    for (const src of [worker, vercel]) {
      expect(src).toMatch(/ALLOWED_ORIGINS\.includes\(origin\)/);
      expect(src).toMatch(/403/);
    }
  });

  it('rate-limits and anchors the role the caller cannot overwrite', () => {
    for (const src of [worker, vercel]) {
      expect(src).toContain('withinRate');
      expect(src).toContain('FIXED_ROLE');
      expect(src).toContain('anchoredSystem');
    }
  });

  it('does not echo provider errors back to an anonymous caller', () => {
    for (const src of [worker, vercel]) {
      expect(src).not.toMatch(/all providers failed \(\$\{errors/);
    }
  });
});
