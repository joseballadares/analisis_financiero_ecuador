import type { Direction } from "@/lib/star";

export type Tone = "good" | "bad" | "flat";

const isNum = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

// Verde si la tendencia es favorable, rojo si es desfavorable, gris si la variación total es menor al
// umbral (±3%) o el indicador no tiene una dirección clara. Compara el primer y el último dato.
export function trendTone(values: (number | null)[], dir: Direction, threshold = 0.03): Tone {
  const pts = values.filter(isNum);
  if (pts.length < 2 || dir === "neutral") return "flat";
  const first = pts[0];
  const last = pts[pts.length - 1];
  const change = (last - first) / Math.max(Math.abs(first), 1e-9);
  if (Math.abs(change) < threshold) return "flat";
  const up = change > 0;
  return (dir === "higher") === up ? "good" : "bad";
}

export const TONE_COLOR: Record<Tone, string> = {
  good: "var(--positive)",
  bad: "var(--negative)",
  flat: "var(--muted)",
};

// Dirección favorable de cada cuenta de los estados NIIF (para colorear la tendencia por línea):
// lo que sube y es bueno (ingresos, utilidades, activos, efectivo, patrimonio), lo que sube y es malo
// (costos, gastos, pasivos y obligaciones financieras) y lo ambiguo (cuentas por cobrar, inventarios, por pagar).
const NEUTRAL_CODES = new Set(["10102", "1010205", "1010206", "10103", "10105", "20103", "20108", "20204", "40112", "40113", "601", "603", "605", "606"]);

export function statementDirection(code: string): Direction {
  for (const n of NEUTRAL_CODES) if (code === n || code.startsWith(n)) return "neutral";
  const c = code[0];
  if (c === "1" || c === "3") return "higher";
  if (c === "2") return "lower";
  if (c === "4") return "higher";
  if (c === "5") return "lower";
  if (c === "6" || c === "7") return "higher";
  return "neutral";
}
