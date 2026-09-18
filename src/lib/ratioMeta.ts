import ratiosData from "@/data/ratios.json";
import { DIRECTION, NEW_RATIOS, RENAMED, type Direction, type Flag } from "@/lib/star";

export type RatioInfo = {
  key: string;
  nombre: string;
  formula: string;
  categoria: string;
  direction: Direction;
};

type Indicador = { key: string; categoria: string; nombre: string; formula: string };

const existing = (ratiosData.indicadores as Indicador[]).map((i) => i.key);

export function ratioInfo(key: string): RatioInfo | null {
  const base = (ratiosData.indicadores as Indicador[]).find((i) => i.key === key);
  const add = NEW_RATIOS[key];
  const src = base ?? (add ? { key, ...add } : null);
  if (!src) return null;
  const ren = RENAMED[key];
  return {
    key,
    nombre: ren?.nombre ?? src.nombre,
    formula: ren?.formula ?? src.formula,
    categoria: src.categoria,
    direction: DIRECTION[key] ?? "neutral",
  };
}

export const CATEGORY_ORDER = ["liquidez", "solvencia", "gestion", "rentabilidad", "flujo"];

export const CATEGORY_LABELS: Record<string, string> = {
  liquidez: "Liquidez",
  solvencia: "Solvencia y deuda",
  gestion: "Gestión y ciclo de efectivo",
  rentabilidad: "Rentabilidad",
  flujo: "Flujo de caja (estimado)",
};

export function keysByCategory(): Record<string, string[]> {
  const out: Record<string, string[]> = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, [] as string[]]));
  for (const k of existing) {
    const info = ratioInfo(k);
    if (info) out[info.categoria]?.push(k);
  }
  for (const k of Object.keys(NEW_RATIOS)) {
    const info = ratioInfo(k);
    if (info) out[info.categoria]?.push(k);
  }
  return out;
}

export const FLAG_LABEL: Record<Flag, string> = {
  aprox: "aprox.",
  aprox_bajo: "aprox.",
  estimado: "estimado",
};

export const FLAG_HELP: Record<Flag, string> = {
  aprox: "Aproximado: usa la depreciación y amortización que reporta la Superintendencia, que puede ser incompleta.",
  aprox_bajo:
    "Aproximado y posiblemente subestimado: la depreciación y amortización reportadas son nulas o muy bajas frente al activo fijo, por lo que el EBITDA real podría ser mayor.",
  estimado: "Estimado con variaciones entre balances o supuestos sobre el costo de ventas; ver la metodología.",
};
