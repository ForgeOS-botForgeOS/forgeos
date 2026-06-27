// Minimal dependency-free sparkline — a single polyline + a dot on the latest
// point. Used for the 7-day readiness trend without pulling in a chart lib.
export function Sparkline({
  values,
  color = 'rgb(var(--accent))',
  width = 104,
  height = 30,
}: {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 3;
  const xy = (v: number, i: number): [number, number] => [
    (i / (values.length - 1)) * (width - pad * 2) + pad,
    height - pad - ((v - min) / range) * (height - pad * 2),
  ];
  const points = values.map((v, i) => xy(v, i).join(',')).join(' ');
  const [lx, ly] = xy(values[values.length - 1], values.length - 1);
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill={color} />
    </svg>
  );
}
