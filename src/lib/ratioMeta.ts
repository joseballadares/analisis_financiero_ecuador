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

// Grupos por tipo de ratio para presentar los indicadores de forma ordenada.
export type RatioGroup = { id: string; label: string; desc: string; keys: string[] };

export const GROUPS: RatioGroup[] = [
  {
    id: "margenes",
    label: "Márgenes",
    desc: "Cuánto queda de cada dólar vendido en cada nivel del estado de resultados.",
    keys: ["margen_bruto", "margen_operacional", "margen_ebitda", "rent_neta_ventas", "impac_gasto_a_v"],
  },
  {
    id: "retorno",
    label: "Retorno sobre la inversión",
    desc: "Qué rendimiento genera la empresa sobre sus activos, su patrimonio y su capital invertido.",
    keys: ["roe", "roa", "roic", "rent_neta_activo", "rent_ope_activo", "rent_ope_patrimonio"],
  },
  {
    id: "liquidez",
    label: "Liquidez",
    desc: "Capacidad de pagar las obligaciones de corto plazo.",
    keys: ["liquidez_corriente", "prueba_acida", "razon_inmediata", "capital_trabajo"],
  },
  {
    id: "endeudamiento",
    label: "Endeudamiento y estructura",
    desc: "Cómo se financia la empresa y cuánto pesa la deuda.",
    keys: [
      "end_activo",
      "end_patrimonial",
      "apalancamiento",
      "apalancamiento_financiero",
      "end_corto_plazo",
      "end_largo_plazo",
      "end_activo_fijo",
      "fortaleza_patrimonial",
      "end_patrimonial_ct",
      "end_patrimonial_nct",
      "apalancamiento_c_l_plazo",
      "deuda_neta_ebitda",
    ],
  },
  {
    id: "cobertura",
    label: "Cobertura de deuda",
    desc: "Si la operación genera lo suficiente para pagar los intereses.",
    keys: ["cobertura_interes", "cobertura_ebitda", "impac_carga_finan"],
  },
  {
    id: "eficiencia",
    label: "Eficiencia (rotaciones)",
    desc: "Qué tan bien usa los activos para generar ventas.",
    keys: ["rot_ventas", "rot_activo_fijo", "rot_cartera"],
  },
  {
    id: "ciclo",
    label: "Ciclo de efectivo",
    desc: "Cuántos días tarda en cobrar, vender el inventario y pagar.",
    keys: ["per_med_cobranza", "dio", "per_med_pago", "ccc"],
  },
  {
    id: "flujo",
    label: "Flujo de caja (estimado)",
    desc: "Efectivo que genera el negocio después de sus inversiones, estimado con variaciones del balance.",
    keys: ["fcf", "fcf_margen"],
  },
];

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
