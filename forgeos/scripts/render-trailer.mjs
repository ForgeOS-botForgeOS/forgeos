#!/usr/bin/env node
// Renders the ForgeOS trailer to an MP4 (1080x1920, 30 fps, with its soundtrack).
//
// It drives the real trailer in headless Chrome through its capture mode
// (#/trailer?capture=1): the time is set frame by frame, so every frame is
// exact no matter how slow the machine is, and the soundtrack is rendered
// offline by the same synth the website plays.
//
//   node scripts/render-trailer.mjs                         # from the live site, English
//   node scripts/render-trailer.mjs --lang sk               # Slovak
//   node scripts/render-trailer.mjs --url http://127.0.0.1:5199/ --out /tmp/t.mp4
//
// Needs Google Chrome (or CHROME=/path/to/chrome) and ffmpeg on the PATH.
// Node 22+ (it uses the built-in WebSocket).

import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith('--') ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []),
);
const URL_BASE = args.url ?? 'https://forgeos-botforgeos.github.io/forgeos/';
const LANG = args.lang === 'sk' ? 'sk' : 'en';
const OUT = resolve(args.out ?? `forgeos-trailer-${LANG}.mp4`);
const FPS = 30;
const PORT = 9400 + Math.floor(Math.random() * 400);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const work = mkdtempSync(join(tmpdir(), 'forgeos-trailer-'));
const chrome = spawn(process.env.CHROME ?? 'google-chrome', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(work, 'profile')}`,
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank',
], { stdio: 'ignore' });

async function cdp() {
  let targets = [];
  for (let i = 0; i < 80 && !targets.length; i++) {
    try {
      targets = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).filter((t) => t.type === 'page');
    } catch {
      await sleep(250);
    }
  }
  if (!targets.length) throw new Error('Chrome did not start');
  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
    }
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? res.result.exceptionDetails.text);
    return res.result?.result?.value;
  };
  return { send, evaluate, close: () => ws.close() };
}

try {
  const page = await cdp();
  await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 3, mobile: true });
  // The language is a stored setting: set it, then load the trailer fresh so the app reads it.
  await page.send('Page.navigate', { url: `${URL_BASE}#/download` });
  await sleep(2500);
  await page.evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('forge-settings') || '{"state":{},"version":0}');
    s.state = { ...s.state, language: '${LANG}' };
    localStorage.setItem('forge-settings', JSON.stringify(s));
  })()`);
  await page.send('Page.navigate', { url: 'about:blank' });
  await sleep(300);
  await page.send('Page.navigate', { url: `${URL_BASE}#/trailer?capture=1` });
  for (let i = 0; i < 120; i++) {
    if (await page.evaluate('Boolean(window.__forgeTrailer && window.__forgeTrailer.ready())')) break;
    if (i === 119) throw new Error('the trailer never became ready (is the URL right, and does it have the capture hook?)');
    await sleep(250);
  }
  await page.evaluate('document.fonts.ready.then(() => true)');
  const duration = await page.evaluate('window.__forgeTrailer.duration');
  const frames = Math.round(duration * FPS);
  for (let f = 0; f < frames; f++) {
    await page.evaluate(`window.__forgeTrailer.seek(${f / FPS})`);
    const shot = await page.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, fromSurface: true });
    writeFileSync(join(work, `f${String(f).padStart(4, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
    if (f % 60 === 0) process.stdout.write(`\rframes ${f}/${frames}`);
  }
  process.stdout.write(`\rframes ${frames}/${frames}\n`);
  writeFileSync(join(work, 'audio.wav'), Buffer.from(await page.evaluate('window.__forgeTrailer.audio()'), 'base64'));
  page.close();
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(work, 'f%04d.jpg'), '-i', join(work, 'audio.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', '-shortest', OUT,
  ], { stdio: 'inherit' });
  console.log(`wrote ${OUT}`);
} finally {
  chrome.kill();
  rmSync(work, { recursive: true, force: true });
}
