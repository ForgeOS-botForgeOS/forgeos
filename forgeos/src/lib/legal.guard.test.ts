import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The legal floor for publishing, as tests, so a later change cannot quietly
// undo it.
const root = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('legal guard', () => {
  it('loads no font or stylesheet from a third-party CDN', () => {
    // A Google Fonts link sends every visitor's IP to Google without consent.
    for (const f of ['index.html', 'src/index.css']) {
      expect(read(f)).not.toMatch(/fonts\.(googleapis|gstatic)\.com|@import\s+url\(\s*['"]?https?:/);
    }
  });

  it('ships a privacy policy and terms, each with a favicon and no stale placeholder', () => {
    for (const page of ['public/privacy.html', 'public/terms.html']) {
      expect(existsSync(resolve(root, page))).toBe(true);
      const html = read(page);
      expect(html).toMatch(/rel="icon"/);
      expect(html).toMatch(/Last updated: \d{1,2} \w+ 20\d\d/);
      expect(html).not.toMatch(/TODO|lorem|\[your/i);
    }
  });

  it('states the Slovak age of digital consent and the health-data basis', () => {
    const privacy = read('public/privacy.html');
    expect(privacy).toMatch(/under 16/);
    expect(privacy).toMatch(/Article 9/);
  });

  it('links both pages where accounts are created and on the download page', () => {
    for (const f of ['src/screens/onboarding/Onboarding.tsx', 'src/screens/Download.tsx', 'src/screens/Profile.tsx']) {
      const src = read(f);
      expect(src).toMatch(/privacy\.html/);
      expect(src).toMatch(/terms\.html/);
    }
  });
});
