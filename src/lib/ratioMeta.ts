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

// Grupos por tipo de ratio (en este orden se muestran los botones y las secciones).
export type RatioGroup = { id: string; label: string; short: string; desc: string; keys: string[] };

export const GROUPS: RatioGroup[] = [
  {
    id: "rentabilidad",
    label: "Rentabilidad",
    short: "Rentabilidad",
    desc: "Cuánto queda de cada dólar vendido en cada nivel del estado de resultados.",
    keys: ["margen_bruto", "margen_operacional", "margen_ebitda", "rent_neta_ventas", "impac_gasto_a_v"],
  },
  {
    id: "liquidez",
    label: "Liquidez",
    short: "Liquidez",
    desc: "Capacidad de pagar las obligaciones de corto plazo.",
    keys: ["liquidez_corriente", "prueba_acida", "razon_inmediata", "capital_trabajo"],
  },
  {
    id: "operatividad",
    label: "Operatividad",
    short: "Operatividad",
    desc: "Qué tan bien usa sus activos y cuánto tarda el ciclo de cobrar, vender y pagar; incluye el flujo de caja estimado.",
    keys: [
      "rot_ventas",
      "rot_activo_fijo",
      "rot_cartera",
      "rot_inventarios",
      "rot_capital_trabajo",
      "per_med_cobranza",
      "dio",
      "per_med_pago",
      "ccc",
      "fcf",
      "fcf_margen",
    ],
  },
  {
    id: "endeudamiento",
    label: "Endeudamiento y estructura",
    short: "Endeudamiento",
    desc: "Cómo se financia la empresa, cuánto pesa la deuda y si la operación alcanza para pagarla.",
    keys: [
      "end_activo",
      "end_patrimonial",
      "independencia_financiera",
      "apalancamiento",
      "apalancamiento_financiero",
      "deuda_patrimonio",
      "deuda_neta_ebitda",
      "end_corto_plazo",
      "end_largo_plazo",
      "concentracion_deuda_cp",
      "end_activo_fijo",
      "cobertura_activo_fijo",
      "peso_activo_corriente",
      "fortaleza_patrimonial",
      "end_patrimonial_ct",
      "end_patrimonial_nct",
      "apalancamiento_c_l_plazo",
      "cobertura_interes",
      "cobertura_ebitda",
      "impac_carga_finan",
    ],
  },
  {
    id: "retorno",
    label: "Retorno sobre la inversión",
    short: "Retorno sobre la inversión",
    desc: "Qué rendimiento genera la empresa sobre sus activos, su patrimonio y su capital invertido.",
    keys: ["roe", "roa", "roic", "roce", "rent_neta_activo", "rent_ope_activo", "rent_ope_patrimonio"],
  },
];

// Ratios que solo existen con balance NIIF: se ocultan cuando no hay ningún valor en los años mostrados.
const NEW_KEYS = new Set(Object.keys(NEW_RATIOS));

export function visibleKeys(
  group: RatioGroup,
  years: number[],
  byYear: Record<number, { values: Record<string, number | null> } | undefined>,
  only?: string[],
): string[] {
  return group.keys
    .filter((k) => !only || only.includes(k))
    .filter((k) => {
      if (!ratioInfo(k)) return false;
      const any = years.some((y) => typeof byYear[y]?.values[k] === "number");
      return any || !NEW_KEYS.has(k);
    });
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
