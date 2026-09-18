import type { Metrics } from "@/lib/db";

// Auditoría de bi_ranking (2024, 142k filas): liquidez, prueba ácida, rotación de ventas,
// endeudamiento del activo, margen bruto e impacto de carga financiera son consistentes con
// las cifras; en cambio la fuente pierde el signo de ROE/ROA/margen neto/endeudamiento
// patrimonial cuando hay pérdidas o patrimonio negativo, "impacto gastos adm. y ventas" usa
// otro denominador, y los períodos medios de cobranza/pago son inservibles (p.ej. 118.323
// días). Estos ratios se recalculan de las cifras exactas de la misma fila.
const ok = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);

export const DERIVED_KEYS = [
  "roe",
  "roa",
  "rent_neta_ventas",
  "end_patrimonial",
  "apalancamiento",
  "impac_gasto_a_v",
  "impac_carga_finan",
  "per_med_cobranza",
  "per_med_pago",
] as const;

export function derivedRatios(m: Metrics): Record<string, number | null> {
  const un = m.utilidad_neta;
  const pat = m.patrimonio;
  const act = m.activos;
  const ven = ok(m.ingresos_ventas) && m.ingresos_ventas > 0 ? m.ingresos_ventas : m.ingresos_totales;
  const posPat = ok(pat) && pat > 0;
  const posAct = ok(act) && act > 0;
  const posVen = ok(ven) && ven > 0;
  return {
    roe: ok(un) && posPat ? un / pat! : null,
    roa: ok(un) && posAct ? un / act! : null,
    rent_neta_ventas: ok(un) && posVen ? un / ven! : null,
    end_patrimonial: posAct && posPat ? (act! - pat!) / pat! : null,
    apalancamiento: posAct && posPat ? act! / pat! : null,
    end_activo: posAct && ok(pat) ? (act! - pat) / act! : null,
    impac_gasto_a_v: ok(m.gastos_admin_ventas) && posVen ? m.gastos_admin_ventas / ven! : null,
    impac_carga_finan: ok(m.gastos_financieros) && posVen ? m.gastos_financieros / ven! : null,
    per_med_cobranza: ok(m.rot_cartera) && m.rot_cartera > 0 ? 365 / m.rot_cartera : null,
    per_med_pago: null,
    margen_bruto: ok(m.margen_bruto) ? m.margen_bruto : null,
    liquidez_corriente: ok(m.liquidez_corriente) ? m.liquidez_corriente : null,
  };
}

export function withDerived(m: Metrics, extra?: Record<string, number | null>): Metrics {
  const d = derivedRatios(m);
  const out: Metrics = { ...m };
  for (const k of DERIVED_KEYS) out[k] = d[k];
  return { ...out, ...(extra ?? {}) };
}

// Período medio de pago ≈ Cuentas y documentos por pagar corrientes * 365 / costo de ventas
// (la fuente no trae compras). Solo para el catálogo NIIF (códigos 20103 y 501).
export function paymentDays(data: Record<string, number>, catalogId: number): number | null {
  if (catalogId !== 3) return null;
  const cxp = data["20103"];
  const costo = data["501"];
  return ok(cxp) && ok(costo) && cxp > 0 && costo > 0 ? (cxp / costo) * 365 : null;
}
