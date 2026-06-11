import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Link2, FileUp, Camera, ShieldCheck, AlertTriangle, Sparkles, Undo2, Lock } from 'lucide-react';
import { Card, Button, Badge, SectionTitle } from '../components/ui';
import { ForgeLogo } from '../components/ForgeLogo';
import { haptic } from '../lib/haptics';
import { toast, celebrate } from '../lib/toast';
import { ingestApi, ingestFile, ingestScreenshots, ingestManual, type Ingested } from '../lib/import/lanes';
import { buildPreview, type ImportPreview } from '../lib/import/pipeline';
import { applyImport, undoImport } from '../lib/import/merge';
import type { LaneId, TrustLevel } from '../lib/import/canonical';
import { useImports } from '../state/importStore';

const TRUST_COLOR: Record<TrustLevel, string> = { high: 'rgb(var(--success))', medium: 'rgb(var(--accent-2))', low: 'rgb(var(--warn))' };
const LANES: { id: LaneId; title: string; trust: TrustLevel; icon: typeof Link2; blurb: string }[] = [
  { id: 'api', title: 'Connect / paste export', trust: 'high', icon: Link2, blurb: 'Paste the JSON your other app exports.' },
  { id: 'file', title: 'Upload a file', trust: 'medium', icon: FileUp, blurb: 'JSON, CSV or XML export file.' },
  { id: 'screenshot', title: 'Screenshot', trust: 'low', icon: Camera, blurb: 'We read your stats from an image.' },
];

export default function ImportProgress() {
  const navigate = useNavigate();
  const imports = useImports((s) => s.imports);
  const [lane, setLane] = useState<LaneId>('api');
  const [source, setSource] = useState('');
  const [text, setText] = useState('');
  const [manual, setManual] = useState({ currentStreak: '', longestStreak: '', lastActive: '', xp: '', coins: '', sessions: '', memberSince: '' });
  const [showManual, setShowManual] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  async function analyze(ing: Ingested) {
    setBusy(true);
    try {
      const p = buildPreview(ing, source);
      setPreview(p);
      haptic(p.rejected ? 'warning' : 'tap');
    } catch (e) {
      toast((e as Error).message || 'Could not read that input.', 'error');
    } finally { setBusy(false); }
  }

  async function onAnalyzeClick() {
    try {
      if (lane === 'api') return analyze(ingestApi(text));
      if (lane === 'file') { fileRef.current?.click(); return; }
      imgRef.current?.click();
    } catch (e) { toast((e as Error).message, 'error'); }
  }

  function commit() {
    if (!preview || preview.rejected) return;
    const summary = applyImport(preview.patch, lane);
    celebrate();
    toast('Progress imported 🎉');
    setResult(summary.message);
    setPreview(null);
    setText('');
  }

  return (
    <div className="px-4 pt-12 pb-10 space-y-4 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>
      <div className="text-center space-y-1">
        <div className="mx-auto w-fit"><ForgeLogo size={48} tile /></div>
        <h1 className="text-2xl font-extrabold tracking-tight">Import your progress</h1>
        <p className="text-sm text-muted">Bring your streak, XP, history and PRs from any app. It only ever <b>adds</b> — you can’t lose anything.</p>
      </div>

      {result && (
        <Card className="border-accent/40 space-y-2 text-center">
          <Sparkles className="mx-auto text-accent" />
          <p className="font-semibold">{result}</p>
          <Button variant="ghost" className="w-full justify-center" onClick={() => setResult(null)}>Import another</Button>
        </Card>
      )}

      {!result && (
        <>
          {/* lane picker */}
          <div className="space-y-2">
            {LANES.map((l) => {
              const Icon = l.icon;
              return (
                <Card key={l.id} onClick={() => { setLane(l.id); setPreview(null); }} className={`flex items-center gap-3 ${lane === l.id ? 'border-accent ring-1 ring-accent' : ''}`}>
                  <Icon size={18} className="text-accent shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{l.title}</p>
                    <p className="text-[11px] text-muted">{l.blurb}</p>
                  </div>
                  <Badge color={TRUST_COLOR[l.trust]}>{l.trust} trust</Badge>
                </Card>
              );
            })}
          </div>

          {/* source + input */}
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Which app? (e.g. Strava, Duolingo)" className="w-full rounded-xl bg-surface-2 border border-line px-4 py-2.5 text-sm" />

          {lane === 'api' && (
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder='{ "currentStreak": 247, "xp": 12400, "memberSince": "2023-01-04", ... }' className="w-full h-36 rounded-xl bg-surface-2 border border-line px-3 py-2 text-sm font-mono" />
          )}
          {lane === 'file' && <p className="text-[11px] text-muted">Tap “Analyze” and choose your export file (.json / .csv / .xml).</p>}
          {lane === 'screenshot' && (
            <div className="space-y-2">
              <p className="text-[11px] text-muted">Tap “Analyze” to pick a screenshot. The image is read, then discarded — never stored.</p>
              <button onClick={() => setShowManual((v) => !v)} className="text-xs text-accent underline-offset-2 hover:underline">Can’t auto-read? Type your stats →</button>
              {showManual && (
                <Card className="grid grid-cols-2 gap-2">
                  {(['currentStreak', 'longestStreak', 'lastActive', 'xp', 'coins', 'sessions', 'memberSince'] as const).map((k) => (
                    <label key={k} className="text-[11px] text-muted">{k}
                      <input value={manual[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} placeholder={k.includes('Active') || k.includes('Since') ? 'YYYY-MM-DD' : '0'} className="w-full mt-0.5 rounded-lg bg-surface-2 border border-line px-2 py-1 text-sm text-text" />
                    </label>
                  ))}
                  <Button className="col-span-2 justify-center" onClick={() => analyze(ingestManual(coerceManual(manual)))}>Analyze typed stats</Button>
                </Card>
              )}
            </div>
          )}

          <input ref={fileRef} type="file" accept=".json,.csv,.xml,application/json,text/csv,text/xml" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) try { await analyze(await ingestFile(f)); } catch (err) { toast((err as Error).message, 'error'); } }} />
          <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e) => { const fs = Array.from(e.target.files ?? []); e.target.value = ''; if (!fs.length) return; try { await analyze(await ingestScreenshots(fs)); } catch (err) { if ((err as Error).message === 'NO_VISION') { setShowManual(true); toast('No image reader configured — type your stats instead.', 'info'); } else toast((err as Error).message, 'error'); } }} />

          {!preview && <Button className="w-full justify-center" disabled={busy} onClick={onAnalyzeClick}>{busy ? 'Reading…' : 'Analyze'}</Button>}

          {preview && <PreviewCard preview={preview} onCancel={() => setPreview(null)} onConfirm={commit} />}
        </>
      )}

      {/* history / undo */}
      {imports.length > 0 && (
        <div>
          <SectionTitle action={<Lock size={13} className="text-muted" />}>Import history</SectionTitle>
          {imports.map((r) => (
            <Card key={r.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.source} · <span className="text-muted font-normal">{r.lane}</span></p>
                <p className="text-[11px] text-muted">{new Date(r.at).toLocaleDateString()} · +{r.summary.xpAdded.toLocaleString()} XP · {r.summary.streakDays}d streak</p>
              </div>
              <Button variant="ghost" className="px-3 py-1.5" onClick={() => { if (undoImport(r.id)) { haptic('warning'); toast(`Reverted ${r.source} import`); } }}>
                <span className="flex items-center gap-1 text-xs"><Undo2 size={13} /> Undo</span>
              </Button>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted/60 text-center">Your data stays on your device. Nothing is uploaded except screenshots you choose to read (then discarded).</p>
    </div>
  );
}

function PreviewCard({ preview, onCancel, onConfirm }: { preview: ImportPreview; onCancel: () => void; onConfirm: () => void }) {
  const { canonical: c, patch, streak, report, issues, rejected } = preview;
  const rows: [string, string][] = [];
  if (patch.streakDays || patch.bestStreak) rows.push(['Streak', streak.continuity === 'continue' ? `${patch.streakDays} days (kept alive)` : `${patch.bestStreak} days (record)`]);
  if (patch.xp) rows.push(['XP', patch.xp.toLocaleString()]);
  if (patch.coins) rows.push(['Coins', `${patch.coins.toLocaleString()}`]);
  if (patch.importedDays.length) rows.push(['History', `${patch.importedDays.length} days`]);
  if (patch.prs.length) rows.push(['Personal bests', `${patch.prs.length}`]);
  if (patch.bodyStats.length) rows.push(['Body measurements', `${patch.bodyStats.length}`]);
  if (patch.achievementsImported) rows.push(['Badges', `${patch.achievementsImported}`]);
  if (c.memberSince) rows.push(['Member since', new Date(c.memberSince).toLocaleDateString()]);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionTitle>Preview</SectionTitle>
        <Badge color={TRUST_COLOR[c.trust]}>{c.trust} trust</Badge>
      </div>

      {rejected ? (
        <div className="flex items-start gap-2 text-sm text-warn"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{report.warnings[0] ?? 'Could not read enough to import.'}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing recognisable found — try another lane or check the format.</p>
      ) : (
        <div className="space-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm"><span className="text-muted">{k}</span><span className="font-mono font-semibold">{v}</span></div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted flex items-start gap-1.5"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-success" /> {streak.reason}</p>

      {report.warnings.filter((_, i) => !(rejected && i === 0)).map((w, i) => <p key={i} className="text-[11px] text-warn">⚠️ {w}</p>)}
      {report.quarantined.length > 0 && <p className="text-[11px] text-warn">Held back as unverified: {report.quarantined.join('; ')}.</p>}
      {issues.length > 0 && <p className="text-[11px] text-muted">{issues.length} bad row(s) skipped.</p>}
      {patch.notes.map((n, i) => <p key={i} className="text-[11px] text-muted/80">• {n}</p>)}

      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1 justify-center" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1 justify-center" disabled={rejected || rows.length === 0} onClick={onConfirm}>Import — keeps the better value</Button>
      </div>
    </Card>
  );
}

function coerceManual(m: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(m)) {
    if (!v) continue;
    out[k] = /active|since/i.test(k) ? v : (isNaN(Number(v)) ? v : Number(v));
  }
  return out;
}
