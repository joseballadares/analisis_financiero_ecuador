import { TONE_COLOR, type Tone } from "@/lib/trend";

export default function Sparkline({
  values,
  width = 84,
  height = 22,
  title,
  tone = "flat",
  color,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
  title?: string;
  tone?: Tone;
  color?: string;
}) {
  const pts = values
    .map((v, i) => (typeof v === "number" && Number.isFinite(v) ? { i, v } : null))
    .filter((p): p is { i: number; v: number } => p !== null);
  if (pts.length < 2) {
    return <span className="text-xs text-muted">—</span>;
  }
  const stroke = color ?? TONE_COLOR[tone];
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const pad = 3;
  const n = Math.max(values.length - 1, 1);
  const x = (i: number) => pad + (i / n) * (width - 2 * pad);
  const y = (v: number) => (max === min ? height / 2 : pad + (1 - (v - min) / span) * (height - 2 * pad));
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" className="inline-block align-middle">
      {title && <title>{title}</title>}
      <polyline
        fill="none"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts.map((p) => `${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
        style={{ stroke }}
      />
      <circle cx={x(last.i)} cy={y(last.v)} r="2.5" style={{ fill: stroke }} />
    </svg>
  );
}
