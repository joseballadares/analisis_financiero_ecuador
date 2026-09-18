import type { Metrics } from "@/lib/db";
import { derivedRatios } from "@/lib/derived";

type Data = Record<string, number>;

const ok = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);

export const TAX_RATE = 0.25;

// Pasivos financieros del plan de cuentas NIIF: arrendamientos, obligaciones con instituciones
// financieras, valores emitidos y otros pasivos financieros (corrientes y no corrientes).
export const DEBT_CODES = ["20102", "20104", "20106", "20109", "20201", "20203", "20205"];
// Activos fijos e intangibles: propiedad, planta y equipo; propiedades de inversión; biológicos; intangibles.
export const FIXED_CODES = ["10201", "10202", "10203", "10204"];

export type Flag = "aprox" | "aprox_bajo" | "estimado";
export type YearRatios = { values: Record<string, number | null>; flags: Record<string, Flag> };

const sum = (d: Data, codes: string[]) => codes.reduce((a, c) => a + (ok(d[c]) ? d[c] : 0), 0);

// Capital de trabajo operativo = cuentas por cobrar comerciales + inventarios - cuentas por pagar.
function operatingWorkingCapital(d: Data): number {
  const cxc = ok(d["1010205"]) ? d["1010205"] : 0;
  const cxcRel = ok(d["1010206"]) ? d["1010206"] : 0;
  return cxc + cxcRel + (d["10103"] ?? 0) - (d["20103"] ?? 0) - (d["20108"] ?? 0);
}

/**
 * Ratios avanzados de un año. `m` son las métricas de la fila (ya con relleno del balance si aplica);
 * `niif` y `prev` son las cuentas del balance NIIF del año y del año anterior (undefined si el plan de
 * cuentas de ese año no es NIIF).
 *
 * Metodología:
 * - EBITDA (aprox.) = utilidad operacional + depreciación + amortización, con la depreciación que reporta la
 *   Superintendencia, que es incompleta en muchas empresas (por eso se marca como aproximado).
 * - FCF (estimado) = utilidad neta - variación del capital de trabajo operativo - variación de activos fijos e
 *   intangibles netos. Equivale a utilidad + depreciación - Δ capital de trabajo - CAPEX, con CAPEX = Δ activo
 *   fijo neto + depreciación; la depreciación se cancela y por eso no depende del dato incompleto.
 * - Deuda financiera = pasivos financieros del balance NIIF; deuda neta = deuda financiera - efectivo.
 * - ROIC = utilidad operacional x (1 - 25%) / (deuda financiera + patrimonio - efectivo).
 */
export function advancedRatios(m: Metrics, niif?: Data, prev?: Data): YearRatios {
  const base = derivedRatios(m);
  const partial = m.sin_detalle_operacional === 1;
  const ven = ok(m.ingresos_ventas) && m.ingresos_ventas > 0 ? m.ingresos_ventas : m.ingresos_totales;
  const posVen = ok(ven) && ven > 0;
  const cvp = m.costos_ventas_prod;
  const uo = posVen && !partial ? ven! - (cvp ?? 0) - (m.gastos_admin_ventas ?? 0) : null;
  const gf = m.gastos_financieros;
  const uai = m.utilidad_an_imp;
  const un = m.utilidad_neta;
  const act = m.activos;
  const pat = m.patrimonio;
  const values: Record<string, number | null> = {};
  const flags: Record<string, Flag> = {};

  const da = (m.depreciaciones ?? 0) + (m.amortizaciones ?? 0);
  const ebitda = uo !== null ? uo + da : null;
  const ppe = niif?.["10201"];
  const daLow = da === 0 || (ok(ppe) && ppe > 1e6 && da / ppe < 0.01);
  values.ebitda = ebitda;
  values.margen_ebitda = ebitda !== null && posVen ? ebitda / ven! : null;
  values.cobertura_ebitda = ebitda !== null && ok(gf) && gf > 0 ? ebitda / gf : null;
  for (const k of ["ebitda", "margen_ebitda", "cobertura_ebitda"]) flags[k] = daLow ? "aprox_bajo" : "aprox";

  const cash = niif?.["10101"];
  const debt = niif ? sum(niif, DEBT_CODES) : null;
  const netDebt = debt !== null ? debt - (ok(cash) ? cash : 0) : null;
  values.deuda_neta = netDebt;
  values.deuda_neta_ebitda = netDebt !== null && ebitda !== null && ebitda > 0 ? netDebt / ebitda : null;
  flags.deuda_neta_ebitda = daLow ? "aprox_bajo" : "aprox";
  const capital = debt !== null && ok(pat) ? debt + pat - (ok(cash) ? cash : 0) : null;
  values.roic = uo !== null && capital !== null && capital > 0 ? (uo * (1 - TAX_RATE)) / capital : null;
  flags.roic = "aprox";

  const cost = niif ? (ok(niif["501"]) ? niif["501"] : cvp) : cvp;
  values.dio = niif && ok(cost) && cost > 0 && ok(niif["10103"]) ? (niif["10103"] / cost) * 365 : null;
  values.per_med_pago = niif && ok(cost) && cost > 0 && ok(niif["20103"]) && niif["20103"] > 0 ? (niif["20103"] / cost) * 365 : null;
  flags.per_med_pago = "estimado";
  const dso = base.per_med_cobranza;
  values.ccc =
    ok(dso) && values.dio !== null && values.per_med_pago !== null ? dso + values.dio - values.per_med_pago : null;
  flags.ccc = "estimado";

  values.razon_inmediata =
    niif && ok(cash) && ok(niif["201"]) && niif["201"] > 0 ? cash / niif["201"] : null;
  values.capital_trabajo = niif && ok(niif["101"]) && ok(niif["201"]) ? niif["101"] - niif["201"] : null;

  if (niif && prev && ok(un)) {
    const dNwc = operatingWorkingCapital(niif) - operatingWorkingCapital(prev);
    const dFixed = sum(niif, FIXED_CODES) - sum(prev, FIXED_CODES);
    values.fcf = un - dNwc - dFixed;
    values.fcf_margen = posVen ? values.fcf / ven! : null;
  } else {
    values.fcf = null;
    values.fcf_margen = null;
  }
  flags.fcf = "estimado";
  flags.fcf_margen = "estimado";

  // DuPont de 5 pasos: ROE = carga fiscal y laboral x carga financiera x margen EBIT x rotación x apalancamiento.
  const ebitD = ok(uai) && ok(gf) ? uai + gf : null;
  const dupont = ok(un) && ok(uai) && uai > 0 && ebitD !== null && ebitD > 0 && posVen && ok(act) && act > 0 && ok(pat) && pat > 0;
  values.dp_carga_fiscal = dupont ? un! / uai! : null;
  values.dp_carga_financiera = dupont ? uai! / ebitD! : null;
  values.dp_margen_ebit = dupont ? ebitD! / ven! : null;
  values.dp_rotacion = dupont ? ven! / act! : null;
  values.dp_apalancamiento = dupont ? act! / pat! : null;

  return { values, flags };
}

export type Financial = { anio: number; metrics: Metrics };
export type BalanceRow = { anio: number; catalog_id: number; data: Data };

// Ratios de todos los años: los básicos desde las métricas de cada año (siempre) y los avanzados solo
// cuando ese año tiene balance NIIF (catálogo 3).
export function ratiosByYear(financials: Financial[], balances: BalanceRow[]): Map<number, YearRatios> {
  const niif = new Map(balances.filter((b) => b.catalog_id === 3).map((b) => [b.anio, b.data]));
  const out = new Map<number, YearRatios>();
  for (const f of financials) {
    const adv = advancedRatios(f.metrics, niif.get(f.anio), niif.get(f.anio - 1));
    const base = derivedRatios(f.metrics);
    out.set(f.anio, { values: { ...f.metrics, ...base, ...adv.values }, flags: adv.flags });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Metadatos de presentación
// ---------------------------------------------------------------------------------------------

export type Direction = "higher" | "lower" | "neutral";

export const DIRECTION: Record<string, Direction> = {
  liquidez_corriente: "higher",
  prueba_acida: "higher",
  razon_inmediata: "higher",
  cobertura_interes: "higher",
  cobertura_ebitda: "higher",
  margen_bruto: "higher",
  margen_operacional: "higher",
  margen_ebitda: "higher",
  rent_neta_ventas: "higher",
  rent_neta_activo: "higher",
  rent_ope_patrimonio: "higher",
  rent_ope_activo: "higher",
  roe: "higher",
  roa: "higher",
  roic: "higher",
  rot_cartera: "higher",
  rot_activo_fijo: "higher",
  rot_ventas: "higher",
  fortaleza_patrimonial: "higher",
  fcf: "higher",
  fcf_margen: "higher",
  end_activo: "lower",
  end_patrimonial: "lower",
  apalancamiento: "lower",
  end_corto_plazo: "lower",
  end_patrimonial_ct: "lower",
  end_patrimonial_nct: "lower",
  apalancamiento_c_l_plazo: "lower",
  impac_gasto_a_v: "lower",
  impac_carga_finan: "lower",
  per_med_cobranza: "lower",
  dio: "lower",
  ccc: "lower",
  deuda_neta_ebitda: "lower",
};

export type RatioMeta = { nombre: string; formula: string; categoria: string; nota?: string };

// Ratios nuevos (los existentes toman nombre y fórmula de src/data/ratios.json).
export const NEW_RATIOS: Record<string, RatioMeta> = {
  margen_ebitda: { nombre: "Margen EBITDA", formula: "(Utilidad operacional + depreciación + amortización) / Ingresos", categoria: "rentabilidad" },
  roic: { nombre: "ROIC (retorno sobre el capital invertido)", formula: "Utilidad operacional x (1 - 25%) / (Deuda financiera + Patrimonio - Efectivo)", categoria: "rentabilidad" },
  razon_inmediata: { nombre: "Razón de efectivo", formula: "Efectivo / Pasivo corriente", categoria: "liquidez" },
  capital_trabajo: { nombre: "Capital de trabajo", formula: "Activo corriente - Pasivo corriente", categoria: "liquidez" },
  deuda_neta_ebitda: { nombre: "Deuda neta / EBITDA", formula: "(Deuda financiera - Efectivo) / EBITDA", categoria: "solvencia" },
  cobertura_ebitda: { nombre: "Cobertura de intereses con EBITDA", formula: "EBITDA / Gastos financieros", categoria: "solvencia" },
  dio: { nombre: "Días de inventario (DIO)", formula: "Inventarios / Costo de ventas x 365", categoria: "gestion" },
  ccc: { nombre: "Ciclo de conversión de efectivo (CCC)", formula: "DSO + DIO - DPO", categoria: "gestion" },
  fcf: { nombre: "Flujo de caja libre (FCF) estimado", formula: "Utilidad neta - Δ capital de trabajo operativo - Δ activos fijos e intangibles", categoria: "flujo" },
  fcf_margen: { nombre: "Margen de flujo de caja libre", formula: "FCF estimado / Ingresos", categoria: "flujo" },
};

// Nombres en español con la sigla en inglés para los ratios que ya existían.
export const RENAMED: Record<string, { nombre?: string; formula?: string }> = {
  per_med_cobranza: { nombre: "Días de cobro (DSO)", formula: "365 / Rotación de cartera" },
  per_med_pago: { nombre: "Días de pago (DPO)", formula: "Cuentas y documentos por pagar x 365 / Costo de ventas" },
  liquidez_corriente: { nombre: "Razón corriente (Current Ratio)" },
  rot_ventas: { nombre: "Rotación de activos", formula: "Ingresos / Activo total" },
};

export const MONEY_KEYS = new Set(["fcf", "capital_trabajo", "ebitda", "deuda_neta"]);
