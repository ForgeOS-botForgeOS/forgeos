import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The OTA web bundle runs as code inside the app, so how it is accepted is a
// security boundary. These read the native source and the workflow as text
// (no Android SDK here) and fail if a refactor drops a check.

const kt = readFileSync(join(__dirname, '../../android/app/src/main/java/com/forgeos/app/WebUpdatePlugin.kt'), 'utf8');
const wf = readFileSync(join(__dirname, '../../../.github/workflows/android.yml'), 'utf8');

describe('OTA web bundle acceptance', () => {
  it('checks the SHA-256 and the signature before unzipping anything', () => {
    const sha = kt.indexOf('sha256Hex(bytes).equals(wantSha256');
    const sig = kt.indexOf('signatureOk(bytes, manifest.optString("zipSig"))');
    const unzip = kt.indexOf('unzip(bytes, dir)');
    expect(sha).toBeGreaterThan(0);
    expect(sig).toBeGreaterThan(sha);
    expect(unzip).toBeGreaterThan(sig);
  });

  it('verifies ECDSA P-256 against a pinned key and fails closed on any error', () => {
    expect(kt).toMatch(/SHA256withECDSA/);
    expect(kt).toMatch(/if \(sigB64\.isEmpty\(\)\) return false/);
    expect(kt).toMatch(/catch \(e: Exception\) \{\s*false/);
  });

  it('keeps the zip-slip and zip-bomb guards', () => {
    expect(kt).toMatch(/startsWith\(root\)/);
    expect(kt).toMatch(/MAX_UNZIPPED_BYTES/);
  });

  it('CI signs the bundle when the secret exists and publishes zipSig', () => {
    expect(wf).toMatch(/OTA_SIGNING_KEY_PEM_B64/);
    expect(wf).toMatch(/openssl dgst -sha256 -sign/);
    expect(wf).toMatch(/"zipSig":"%s"/);
  });

  it('only fetches update artefacts over https from the ForgeOS release', () => {
    const urls = kt.match(/"https?:\/\/[^"]+"/g) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u).toMatch(/^"https:\/\/github\.com\/ForgeOS-botForgeOS\/forgeos\/releases\/download\/app-latest\//);
  });
});
