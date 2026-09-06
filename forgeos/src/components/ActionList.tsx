import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

// One row shape, used everywhere the app offers "a thing you can go to or do":
// the Apprentice habit map, search results, and the plan-tools menu all render
// through this. Before it existed each of those invented its own row, so the
// same idea looked different on three screens and the padding never matched.
//
// A row is: an optional icon, a title, an optional line of context under it,
// and a chevron that means "this goes somewhere". Nothing else — the moment a
// row needs more than that it is a Card, not a list row.

export interface ActionRowProps {
  icon?: ReactNode;
  title: ReactNode;
  /** The quiet second line: where this lives, or what it will do. */
  detail?: ReactNode;
  /** Right-hand accessory — a count, a badge. Replaces the chevron when given. */
  trailing?: ReactNode;
  onClick: () => void;
  /** Destructive rows tint their title, so "delete" never looks like "open". */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  ariaLabel?: string;
}

export function ActionRow({ icon, title, detail, trailing, onClick, tone = 'default', disabled, ariaLabel }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors active:bg-surface-2 disabled:opacity-40"
    >
      {icon && (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-medium ${tone === 'danger' ? 'text-danger' : ''}`}>{title}</span>
        {detail && <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted">{detail}</span>}
      </span>
      {trailing ?? <ChevronRight size={15} className="shrink-0 text-muted" aria-hidden="true" />}
    </button>
  );
}

/** A titled run of rows, hairline-separated. Omit the title for an untitled group. */
export function ActionGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      {title && <p className="px-1 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted/70">{title}</p>}
      <div className="divide-y divide-line/70">{children}</div>
    </div>
  );
}
