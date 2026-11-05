import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { APP_ICONS, appIconSwitchAvailable, getAppIcon, setAppIcon, type AppIconId } from '../lib/appIcon';
import { haptic } from '../lib/haptics';
import { toast } from '../lib/toast';
import { useT } from '../lib/i18n';

// Launcher icon colour, Android app only: a row of mini icons in each colour.
export function AppIconPicker() {
  const t = useT();
  const [current, setCurrent] = useState<AppIconId | null>(null);
  const [busy, setBusy] = useState(false);
  const available = appIconSwitchAvailable();

  useEffect(() => {
    if (!available) return;
    let alive = true;
    getAppIcon().then((id) => { if (alive) setCurrent(id); });
    return () => { alive = false; };
  }, [available]);

  if (!available) return null;

  async function pick(id: AppIconId) {
    if (busy || id === current) return;
    setBusy(true);
    const ok = await setAppIcon(id);
    setBusy(false);
    if (!ok) { toast(t('p.appIcon.failed'), 'error'); return; }
    setCurrent(id);
    haptic('success');
    toast(t('p.appIcon.changed'), 'success');
  }

  return (
    <div className="mt-3">
      <p className="text-sm font-medium">{t('p.appIcon')}</p>
      <p className="text-[11px] text-muted mb-2">{t('p.appIcon.hint')}</p>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={t('p.appIcon')} data-noswipe>
        {APP_ICONS.map((icon) => {
          const active = current === icon.id;
          const name = t(`p.appIcon.${icon.id}`);
          return (
            <button
              key={icon.id}
              role="radio"
              aria-checked={active}
              aria-label={name}
              disabled={busy}
              onClick={() => pick(icon.id)}
              className="flex flex-col items-center gap-1 rounded-xl py-1.5 transition active:scale-95 disabled:opacity-60"
            >
              <span
                className={`relative grid place-items-center w-11 h-11 rounded-[14px] shadow-sm ${active ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''}`}
                style={{ background: icon.hex }}
              >
                <AnvilGlyph />
                {active && (
                  <span className="absolute -top-1 -right-1 grid place-items-center w-4 h-4 rounded-full bg-accent text-white">
                    <Check size={10} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </span>
              <span className={`text-[10px] ${active ? 'text-text font-semibold' : 'text-muted'}`}>{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The launcher anvil in miniature: the same path as res/drawable/ic_stat_forge.xml.
function AnvilGlyph() {
  return (
    <svg viewBox="1 4 22 16" className="w-8 h-6" aria-hidden="true">
      <path fill="#F4F4F6" d="M3.96,9.34H21.74V9.76H3.96ZM1.85,9.76H21.31V10.18H1.85ZM1,10.18H23.01V11.03H1ZM3.96,11.03H23.01V11.88H3.96ZM8.62,11.88H19.2V13.57H8.62ZM10.73,13.57H14.97V16.53H10.73ZM6.92,16.53H18.77V18.23H6.92ZM5.66,18.23H20.04V19.07H5.66ZM6.59,4.83H7.79V7.93H6.59ZM5.64,5.78H8.74V6.98H5.64ZM10.24,6.22H11.08V8.12H10.24ZM9.71,6.75H11.61V7.59H9.71ZM3.62,7.57H4.72V8.67H3.62Z" />
    </svg>
  );
}
