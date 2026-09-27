import { useId } from 'react';
import { CartesianGrid } from 'recharts';
import { useSettings } from '../state/settingsStore';

// The Tempo chart language, handed to every recharts chart in the app.
//
// Most of the look lives in CSS (index.css → "Tempo charts"): tick type, the
// tooltip panel, the hover cursor, the active dot. Those are the same for every
// chart and CSS can reach them. What CSS cannot reach is geometry and paint
// that recharts writes as SVG attributes — bar corner radii, gradient fills,
// the baseline grid — so those come from here.
//
// Every helper takes the Legacy value and returns it untouched outside Tempo,
// so Legacy renders exactly as it did before this kit existed.

export type ChartTone = 'accent' | 'accent-2' | 'success';
const TONES: readonly ChartTone[] = ['accent', 'accent-2', 'success'];

/** Recharts elements are returned as values (not components), because recharts
 *  identifies its children by element type. */
export function useChartKit() {
  const v2 = useSettings((s) => s.designMode === 'v2');
  // One id per chart: SVG gradient ids are document-global, and two charts on
  // one screen must not resolve each other's gradients.
  const uid = `ck${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ref = (kind: 'area' | 'bar', tone: ChartTone) => `url(#${uid}-${kind}-${tone})`;

  return {
    v2,
    /** Gradient definitions. Place first inside the chart. */
    defs: v2 ? (
      <defs>
        {TONES.map((tone) => (
          <linearGradient key={`a-${tone}`} id={`${uid}-area-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: `rgb(var(--${tone}))`, stopOpacity: 0.32 }} />
            <stop offset="100%" style={{ stopColor: `rgb(var(--${tone}))`, stopOpacity: 0 }} />
          </linearGradient>
        ))}
        {TONES.map((tone) => (
          <linearGradient key={`b-${tone}`} id={`${uid}-bar-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: `rgb(var(--${tone}))`, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: `rgb(var(--${tone}))`, stopOpacity: 0.35 }} />
          </linearGradient>
        ))}
      </defs>
    ) : null,
    /** Faint horizontal baselines — a telemetry scale, never vertical clutter. */
    grid: v2 ? <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="2 5" /> : null,
    /** Bar paint: a signal gradient that settles into the baseline. */
    barFill: (tone: ChartTone, legacy: string) => (v2 ? ref('bar', tone) : legacy),
    /** Bar corners: squared telemetry blocks instead of rounded tabs. */
    radius: (legacy: [number, number, number, number]): [number, number, number, number] =>
      v2 ? [2, 2, 0, 0] : legacy,
    /** Fill under a trend line, for an `<Area>` rendered only in Tempo. */
    areaFill: (tone: ChartTone) => ref('area', tone),
    /** Entrance timing: a single sweep, slower than a hover so it reads as a reveal. */
    motion: v2 ? ({ animationDuration: 900, animationEasing: 'ease-out' } as const) : {},
  };
}
