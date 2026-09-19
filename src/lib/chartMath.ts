import { formatCompactMoney, formatMoney, formatNumber, formatPercent } from "@/lib/format";

export function niceStep(range: number, ticks: number) {
  const raw = range / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

export type Unit = "money" | "percent" | "ratio" | "days" | "count";
export const isNum = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function fmtTick(unit: Unit, v: number, step: number): string {
  if (unit === "money") return formatCompactMoney(v);
  if (unit === "percent") return formatPercent(v, step * 100 < 1 ? 1 : 0);
  if (unit === "ratio") return formatNumber(v, step < 0.1 ? 2 : 1);
  if (unit === "count") return formatNumber(v, 0);
  return `${formatNumber(v, 0)} d`;
}

export function fmtShort(unit: Unit, v: number): string {
  if (unit === "money") return formatCompactMoney(v);
  if (unit === "percent") return formatPercent(v, 1);
  if (unit === "ratio") return formatNumber(v, 2);
  if (unit === "count") return formatNumber(v, 0);
  return `${formatNumber(v, 0)} d`;
}

export function fmtFull(unit: Unit, v: number): string {
  if (unit === "money") return formatMoney(v);
  if (unit === "percent") return formatPercent(v, 1);
  if (unit === "ratio") return formatNumber(v, 2);
  if (unit === "count") return formatNumber(v, 0);
  return `${formatNumber(v, 0)} días`;
}

// Cambio frente al año anterior: relativo en dinero, absoluto (pp, veces o días) en el resto.
export function fmtDelta(unit: Unit, cur: number, prev: number): string | null {
  const sign = (d: number) => (d > 0 ? "+" : d < 0 ? "−" : "");
  if (unit === "money") {
    if (prev === 0) return null;
    const d = (cur - prev) / Math.abs(prev);
    return `${sign(d)}${formatPercent(Math.abs(d), 1)}`;
  }
  const d = cur - prev;
  if (unit === "percent") return `${sign(d)}${formatNumber(Math.abs(d) * 100, 1)} pp`;
  if (unit === "ratio") return `${sign(d)}${formatNumber(Math.abs(d), 2)}`;
  return `${sign(d)}${formatNumber(Math.abs(d), 0)} d`;
}

// Escala ajustada a los datos (incluye el cero cuando los valores están cerca de él o lo cruzan).
export function lineScale(values: (number | null)[]) {
  const nums = values.filter(isNum);
  if (nums.length === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
  let lo = Math.min(...nums);
  let hi = Math.max(...nums);
  if (hi - lo === 0) {
    const d = Math.abs(hi) * 0.1 || 1;
    lo -= d;
    hi += d;
  }
  if (lo >= 0 && lo <= hi * 0.4) lo = 0;
  else if (hi <= 0 && hi >= lo * 0.4) hi = 0;
  else {
    const pad = (hi - lo) * 0.12;
    const wasPositive = lo >= 0;
    const wasNegative = hi <= 0;
    lo -= pad;
    hi += pad;
    if (wasPositive && lo < 0) lo = 0;
    if (wasNegative && hi > 0) hi = 0;
  }
  const step = niceStep(hi - lo, 3);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v / step) * step);
  return { min, max, step, ticks };
}

