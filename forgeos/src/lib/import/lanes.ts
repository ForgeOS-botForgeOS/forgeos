import { LANE_TRUST, type LaneId, type TrustLevel } from './canonical';

// One ingestion interface for all three lanes. Each returns a STRUCTURED object
// (whatever shape) plus its lane/trust — everything after this speaks canonical.
export interface Ingested {
  raw: unknown;
  lane: LaneId;
  trust: TrustLevel;
}

const VISION_URL = import.meta.env.VITE_VISION_API_URL as string | undefined;
export const screenshotLaneLive = Boolean(VISION_URL);

// ---- File parsing (JSON / CSV / XML) ----
function parseCSV(text: string): Record<string, unknown>[] {
  const rows = text.split(/\r?\n/).filter((l) => l.trim());
  if (rows.length < 2) return [];
  const split = (l: string) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) ?? [];
  const header = split(rows[0]);
  return rows.slice(1).map((r) => {
    const cells = split(r);
    const obj: Record<string, unknown> = {};
    header.forEach((h, i) => { if (h) obj[h] = cells[i]; });
    return obj;
  });
}

function xmlToObj(node: Element): unknown {
  const children = Array.from(node.children);
  if (!children.length) return node.textContent?.trim() ?? '';
  const obj: Record<string, unknown> = {};
  for (const child of children) {
    const val = xmlToObj(child);
    const key = child.tagName;
    if (key in obj) { const ex = obj[key]; obj[key] = Array.isArray(ex) ? [...ex, val] : [ex, val]; }
    else obj[key] = val;
  }
  return obj;
}

async function parseFile(file: File): Promise<unknown> {
  const text = await file.text();
  const name = file.name.toLowerCase();
  if (name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) return JSON.parse(text);
  if (name.endsWith('.xml') || text.trim().startsWith('<')) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('That XML file could not be parsed.');
    return xmlToObj(doc.documentElement);
  }
  // default: CSV
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('That file is empty or in a format we couldn’t read.');
  return rows;
}

// ---- Lanes ----

/** API lane (HIGH trust): structured payload pulled/exported from the source app. */
export function ingestApi(jsonText: string): Ingested {
  const trimmed = jsonText.trim();
  if (!trimmed) throw new Error('Paste the JSON your other app exported.');
  let raw: unknown;
  try { raw = JSON.parse(trimmed); } catch { throw new Error('That isn’t valid JSON — paste the exact export from the source app.'); }
  return { raw, lane: 'api', trust: LANE_TRUST.api };
}

/** File lane (MEDIUM trust): a user-provided export file. */
export async function ingestFile(file: File): Promise<Ingested> {
  return { raw: await parseFile(file), lane: 'file', trust: LANE_TRUST.file };
}

/** Screenshot lane (LOW trust): a vision model extracts fields from image(s). */
export async function ingestScreenshots(files: File[]): Promise<Ingested> {
  if (!VISION_URL) throw new Error('NO_VISION'); // UI falls back to a quick manual form
  const merged: Record<string, unknown> = {};
  for (const file of files) {
    const b64 = await fileToBase64(file);
    const res = await fetch(VISION_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: b64, mode: 'progress', prompt: PROGRESS_PROMPT }),
    });
    if (!res.ok) throw new Error('The image reader is unavailable right now.');
    const data = await res.json();
    const obj = typeof data === 'string' ? safeJson(data) : (data.fields ?? data);
    if (obj && typeof obj === 'object') Object.assign(merged, obj);
  }
  // privacy: the raw image is never stored — only the extracted fields survive here
  return { raw: merged, lane: 'screenshot', trust: LANE_TRUST.screenshot };
}

/** Manual fallback for the screenshot lane (still LOW trust) — type what you see. */
export function ingestManual(fields: Record<string, unknown>): Ingested {
  return { raw: fields, lane: 'screenshot', trust: LANE_TRUST.screenshot };
}

const PROGRESS_PROMPT =
  'Extract progress stats from this app screenshot as flat JSON. Use keys when visible: ' +
  'currentStreak, longestStreak, lastActive, memberSince, xp, coins, sessions, level, rank. Numbers only for numeric fields.';

function safeJson(s: string): unknown {
  const m = s.match(/\{[\s\S]*\}/);
  try { return JSON.parse(m ? m[0] : s); } catch { return null; }
}
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
