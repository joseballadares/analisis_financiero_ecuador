import type { RatioDist } from "@/lib/db";
import type { Direction } from "@/lib/star";
import { formatRatioValue } from "@/lib/format";

const RED = "var(--negative)";
const AMBER = "var(--accent)";
const GREEN = "var(--positive)";
const GREY = "var(--border)";

// Minigráfico de posición frente a los pares: la barra representa el percentil de la empresa (0-100)
// dentro de las empresas comparables; los colores indican qué zona es favorable según el ratio.
export function percentileOf(dist: RatioDist | null | undefined): number | null {
  if (!dist || dist.own === null || dist.n < 10) return null;
  return (dist.below / dist.n) * 100;
}

export function zoneColor(pct: number | null, dir: Direction): string {
  if (pct === null) return "var(--muted)";
  if (dir === "neutral") return "var(--muted)";
  const fav = dir === "higher" ? pct : 100 - pct;
  return fav >= 60 ? GREEN : fav >= 33 ? AMBER : RED;
}

export default function Semaforo({
  ratioKey,
  dist,
  dir,
  width = 96,
}: {
  ratioKey: string;
  dist: RatioDist | null | undefined;
  dir: Direction;
  width?: number;
}) {
  const pct = percentileOf(dist);
  if (pct === null || !dist) return <span className="text-xs text-muted">sin pares</span>;
  const h = 16;
  const barY = 6;
  const barH = 5;
  const zones: [number, number, string][] =
    dir === "higher"
      ? [[0, 33, RED], [33, 60, AMBER], [60, 100, GREEN]]
      : dir === "lower"
        ? [[0, 40, GREEN], [40, 67, AMBER], [67, 100, RED]]
        : [[0, 100, GREY]];
  const px = (p: number) => 2 + (p / 100) * (width - 4);
  const color = zoneColor(pct, dir);
  const fmt = (v: number | null) => formatRatioValue(ratioKey, v, 1);
  const label =
    `Empresa: ${fmt(dist.own)} · Mediana de pares: ${fmt(dist.median)} · Rango central (P25–P75): ${fmt(dist.p25)} a ${fmt(dist.p75)} · ` +
    `Percentil ${Math.round(pct)} entre ${dist.n} empresas` +
    (dir === "lower" ? " (menor es mejor)" : dir === "higher" ? " (mayor es mejor)" : "");
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} role="img" className="inline-block align-middle">
      <title>{label}</title>
      {zones.map(([a, b, c], i) => (
        <rect key={i} x={px(a)} y={barY} width={px(b) - px(a)} height={barH} style={{ fill: c, opacity: 0.35 }} />
      ))}
      <line x1={px(50)} x2={px(50)} y1={barY - 2} y2={barY + barH + 2} style={{ stroke: "var(--muted)" }} strokeWidth="1" />
      <circle cx={px(pct)} cy={barY + barH / 2} r="4.5" style={{ fill: color, stroke: "var(--surface)" }} strokeWidth="1.5" />
    </svg>
  );
}
