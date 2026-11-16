// Shared non-component pieces of the trailer: the fixed Tempo colours, text
// fitting for headlines, number formatting and chapter names.
import { useMemo } from 'react';
import { fitFont } from '../../lib/promo/motion';
import type { SceneId } from '../../lib/promo/schedule';
import { useLocale, useT } from '../../lib/i18n';

export const TEAL = '#2fe6c4';
export const HEAT = '#ff5a3c';
export const GOLD = '#ffd24a';
export const GREEN = '#34d399';
export const VIOLET = '#a78bfa';
export const MUTED = '#8a97a6';

let measureCtx: CanvasRenderingContext2D | null | undefined;
const widthCache = new Map<string, number>();

/** Rendered width of a display-face headline, measured on a canvas (estimated if there is none). */
export function measureDisplay(text: string, size: number): number {
  const key = `${size}|${text}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  if (measureCtx === undefined) {
    try {
      measureCtx = document.createElement('canvas').getContext('2d');
    } catch {
      measureCtx = null;
    }
  }
  if (!measureCtx) return [...text].length * size * 0.5;
  measureCtx.font = `italic 700 ${size}px "Saira Condensed", "Saira", sans-serif`;
  const width = measureCtx.measureText(text.toUpperCase()).width + size * 0.22; // synthetic italic overhang
  widthCache.set(key, width);
  return width;
}

/** Fonts finished loading: forget widths measured with the fallback face. */
export function resetMeasurements(): void {
  widthCache.clear();
}

export const fitDisplay = (text: string, max: number, width: number): number => fitFont(text, max, width, measureDisplay);

/** Locale-aware number formatting ("2,500" in English, "2 500" in Slovak). */
export function useFmt(): (n: number, digits?: number) => string {
  const locale = useLocale();
  return useMemo(() => {
    const cache = new Map<number, Intl.NumberFormat>();
    return (n: number, digits = 0) => {
      let nf = cache.get(digits);
      if (!nf) {
        nf = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
        cache.set(digits, nf);
      }
      return nf.format(n);
    };
  }, [locale]);
}

/** Chapter titles, shared by the kickers and the HUD. */
export function useChapterNames(): Partial<Record<SceneId, string>> {
  const tr = useT();
  return {
    train: tr('nav.train'),
    level: tr('Rank up'),
    food: tr('nav.food'),
    coach: tr('AI trainer'),
    social: tr('nav.social'),
    recover: tr('Recovery'),
    progress: tr('Progress'),
    yours: tr('Make it yours'),
  };
}

/** "01 / Train" style chapter kicker text. */
export const kickerText = (n: number | undefined, name: string | undefined): string => `${String(n ?? 0).padStart(2, '0')} / ${name ?? ''}`;
