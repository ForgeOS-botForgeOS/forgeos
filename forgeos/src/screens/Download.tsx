import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Smartphone, Download as DownloadIcon, ShieldCheck, Apple, Share, Copy, Check } from 'lucide-react';
import { Card, Button, Badge } from '../components/ui';
import { ForgeLogo } from '../components/ForgeLogo';
import { InstallButton } from '../components/InstallButton';
import { fetchLatestApkVersion } from '../lib/appUpdate';

// The APK is published by CI to a rolling GitHub release. Distribution is
// website-only (no app stores) — this page is the single download point.
const APK_URL = 'https://github.com/ForgeOS-botForgeOS/forgeos/releases/download/app-latest/forgeos.apk';

export default function Download() {
  const navigate = useNavigate();
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => { void fetchLatestApkVersion().then(setLatest); }, []);

  async function shareLink() {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (nav.share) { try { await nav.share({ title: 'ForgeOS', text: 'Download the ForgeOS Android app', url: APK_URL }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(APK_URL);
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => {
    // Lazy-load the QR generator so it never weighs down the main bundle.
    let alive = true;
    import('qrcode').then((QR) => {
      QR.toDataURL(APK_URL, { margin: 1, width: 320, color: { dark: '#0b0e14', light: '#ffffff' } })
        .then((url) => { if (alive) setQr(url); })
        .catch(() => {});
    });
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-full px-5 py-12 space-y-5 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm"><ChevronLeft size={16} /> Back</button>

      <div className="text-center space-y-2">
        <div className="mx-auto w-fit"><ForgeLogo size={72} tile /></div>
        <h1 className="text-2xl font-extrabold tracking-tight">Get ForgeOS</h1>
        <p className="text-sm text-muted">Install the app on any device. No app store — downloaded right here.</p>
      </div>

      {/* Android APK */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold flex items-center gap-2"><Smartphone size={16} className="text-accent" /> Android app</p>
          <Badge color="rgb(var(--accent))">{latest ? `APK v${latest}` : 'APK'}</Badge>
        </div>
        {qr && (
          <div className="flex justify-center">
            <img src={qr} alt="Scan to download ForgeOS" className="w-40 h-40 rounded-xl border border-line bg-white p-1.5" />
          </div>
        )}
        <p className="text-[11px] text-muted text-center">Scan with your phone, or tap to download.</p>
        <a href={APK_URL}>
          <Button className="w-full justify-center gap-2"><DownloadIcon size={16} /> Download Android app</Button>
        </a>
        {/* The direct download link, shown so you can copy/share it anywhere. */}
        <button onClick={shareLink} className="w-full flex items-center justify-between gap-2 rounded-xl bg-surface-2 border border-line px-3 py-2.5 text-left active:scale-[0.99] transition">
          <span className="text-[11px] text-muted truncate font-mono">{APK_URL}</span>
          <span className="text-[11px] text-accent flex items-center gap-1 shrink-0">{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy link'}</span>
        </button>
        <p className="text-[11px] text-muted/80 flex items-start gap-1.5">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-success" />
          When Android asks, allow “Install unknown apps” for your browser — the app is distributed directly, not via Google Play.
        </p>
      </Card>

      {/* PWA install (iOS + desktop + Android) */}
      <Card className="space-y-3">
        <p className="font-semibold flex items-center gap-2"><Apple size={16} className="text-muted" /> iPhone, iPad &amp; desktop</p>
        <p className="text-[11px] text-muted">Install the web app — it runs full-screen like a native app and works offline.</p>
        <InstallButton variant="big" />
        <p className="text-[11px] text-muted/80 flex items-start gap-1.5">
          <Share size={13} className="mt-0.5 shrink-0 text-accent-2" />
          On iPhone: tap the <b>Share</b> icon in Safari → <b>Add to Home Screen</b>.
        </p>
      </Card>

      <p className="text-[11px] text-muted/60 text-center">ForgeOS is also a website — open it in any browser, no install needed.</p>
    </div>
  );
}
