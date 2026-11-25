import type { CSSProperties, ReactNode } from 'react';
import type { Advance, Color, Credits } from '../data';
import { COLOR_NAMES, COLORS } from '../data';
import { Icon } from './Icon';

/** CSS variables that paint an advance's one or two colors. */
export function advanceColors(a: Pick<Advance, 'colors'>): CSSProperties {
  const [x, y = x] = a.colors;
  return {
    '--swatch-a': `var(--${x})`,
    '--swatch-b': `var(--${y})`,
    '--tint-a': `var(--${x}-tint)`,
    '--tint-b': `var(--${y}-tint)`,
    '--on-a': x === 'yellow' || x === 'orange' ? 'var(--on-yellow)' : 'var(--on-swatch)',
    '--on-b': y === 'yellow' || y === 'orange' ? 'var(--on-yellow)' : 'var(--on-swatch)',
  } as CSSProperties;
}

export function colorNames(a: Pick<Advance, 'colors'>): string {
  return a.colors.map((c) => COLOR_NAMES[c]).join(' / ');
}

/** Trusted, bundled rules text that contains simple markup (<b>, <em>, <br/>). */
export function RulesText({ html, as: Tag = 'p' }: { html: string; as?: 'p' | 'span' }) {
  return <Tag dangerouslySetInnerHTML={{ __html: html }} />;
}

export function CreditPills({ credits }: { credits: Partial<Credits> }) {
  return (
    <div className="credit-row">
      {COLORS.filter((c) => credits[c]).map((c) => (
        <span key={c} className={`credit-pill c-${c}`}>
          {COLOR_NAMES[c]} <span className="num">+{credits[c]}</span>
        </span>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <span className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Icon name="minus" />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Icon name="plus" />
      </button>
    </span>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function colorClass(c: Color) {
  return `c-${c}`;
}
