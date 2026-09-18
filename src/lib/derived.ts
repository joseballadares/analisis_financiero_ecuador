import type { Metrics } from "@/lib/db";

// Auditoría de bi_ranking (2024, 142k filas): liquidez, prueba ácida, rotación de ventas,
// endeudamiento del activo, margen bruto e impacto de carga financiera son consistentes con
// las cifras; en cambio la fuente pierde el signo de ROE/ROA/margen neto/endeudamiento
// patrimonial cuando hay pérdidas o patrimonio negativo, "impacto gastos adm. y ventas" usa
// otro denominador, y los períodos medios de cobranza/pago son inservibles (p.ej. 118.323
// días). Estos ratios se recalculan de las cifras exactas de la misma fila.
const ok = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);

const trunc2 = (x: number) => (x >= 0 ? Math.floor(x * 100 + 1e-9) : -Math.floor(-x * 100 + 1e-9)) / 100;

// La fuente TRUNCA (no redondea) todos sus ratios a 2 decimales, lo que los sesga a la baja hasta
// 0,01 (p. ej. margen bruto 0,2596 aparece como 0,25). Se usa el valor exacto solo cuando
// reproduce el de la fuente al truncarlo; si no coincide (costos mal declarados), se conserva el original.
function exactIfConsistent(source: number | null | undefined, exact: number | null): number | null {
  if (!ok(source)) return null;
  return ok(exact) && Math.abs(trunc2(exact) - source) < 1e-6 ? exact : source;
}

export const DERIVED_KEYS = [
  "end_activo",
  "rot_ventas",
  "margen_bruto",
  "roe",
  "roa",
  "rent_neta_ventas",
  "end_patrimonial",
  "apalancamiento",
  "impac_gasto_a_v",
  "impac_carga_finan",
  "per_med_cobranza",
  "per_med_pago",
  "margen_operacional",
  "rent_ope_patrimonio",
  "rent_ope_activo",
  "cobertura_interes",
  "rent_neta_activo",
  "end_activo_fijo",
  "apalancamiento_financiero",
] as const;

export function derivedRatios(m: Metrics): Record<string, number | null> {
  const partial = m.sin_detalle_operacional === 1;
  const un = m.utilidad_neta;
  const pat = m.patrimonio;
  const act = m.activos;
  const ven = ok(m.ingresos_ventas) && m.ingresos_ventas > 0 ? m.ingresos_ventas : m.ingresos_totales;
  const posPat = ok(pat) && pat > 0;
  const posAct = ok(act) && act > 0;
  const posVen = ok(ven) && ven > 0;
  // Utilidad operacional según la definición de la Superintendencia:
  // ingresos - costo de ventas - gastos de administración y ventas.
  const uo = posVen && !partial ? ven! - (m.costos_ventas_prod ?? 0) - (m.gastos_admin_ventas ?? 0) : null;
  const gf = m.gastos_financieros;
  const uai = m.utilidad_an_imp;
  const uaii = ok(uai) && ok(gf) ? uai + gf : null;
  return {
    roe: ok(un) && posPat ? un / pat! : null,
    roa: ok(un) && posAct ? un / act! : null,
    rent_neta_ventas: ok(un) && posVen ? un / ven! : null,
    end_patrimonial: posAct && posPat ? (act! - pat!) / pat! : null,
    apalancamiento: posAct && posPat ? act! / pat! : null,
    end_activo: posAct && ok(pat) ? (act! - pat) / act! : null,
    impac_gasto_a_v: !partial && ok(m.gastos_admin_ventas) && posVen ? m.gastos_admin_ventas / ven! : null,
    impac_carga_finan: !partial && ok(m.gastos_financieros) && posVen ? m.gastos_financieros / ven! : null,
    per_med_cobranza: ok(m.rot_cartera) && m.rot_cartera > 0 ? 365 / m.rot_cartera : null,
    per_med_pago: null,
    margen_operacional: ok(uo) && posVen ? uo / ven! : null,
    rent_ope_patrimonio: ok(uo) && posPat ? uo / pat! : null,
    rent_ope_activo: ok(uo) && posAct ? uo / act! : null,
    cobertura_interes: ok(uo) && ok(gf) && gf > 0 ? uo / gf : null,
    rent_neta_activo: ok(un) && posAct ? un / act! : null,
    end_activo_fijo:
      posPat && posVen && ok(m.rot_activo_fijo) && m.rot_activo_fijo > 0 ? (pat! * m.rot_activo_fijo) / ven! : null,
    apalancamiento_financiero:
      !partial && ok(uai) && ok(uaii) && uaii > 0 && posPat && posAct && uai !== 0
        ? uai / pat! / (uaii / act!)
        : null,
    margen_bruto: exactIfConsistent(
      m.margen_bruto,
      posVen && ok(m.costos_ventas_prod) && m.costos_ventas_prod > 0 ? (ven! - m.costos_ventas_prod) / ven! : null,
    ),
    rot_ventas: exactIfConsistent(m.rot_ventas, posVen && posAct ? ven! / act! : null),
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

// En 2025 la fuente (bi_ranking) trae ceros para ~1% de las empresas cuyo balance sí fue presentado.
// Para esos casos se toman las cifras principales del balance (solo catálogo NIIF); los ratios que
// requieren el detalle de gastos se omiten (marcados con sin_detalle_operacional).
export function needsBalanceFill(m: Metrics): boolean {
  return !(ok(m.activos) && m.activos > 0);
}

export function fillFromBalance(m: Metrics, data: Record<string, number>, catalogId: number): Metrics {
  if (catalogId !== 3 || !needsBalanceFill(m)) return m;
  const act = data["1"];
  if (!ok(act) || act <= 0) return m;
  const num = (x: number | undefined) => (ok(x) ? x : null);
  const keep = new Set(["n_empleados", "cia_imvalores", "id_estado_financiero"]);
  const base: Metrics = {};
  for (const [k, v] of Object.entries(m)) base[k] = keep.has(k) ? v : null;
  const ven = num(data["401"]);
  const cost = num(data["501"]);
  const ac = num(data["101"]);
  const pc = num(data["201"]);
  return {
    ...base,
    activos: act,
    patrimonio: num(data["3"]),
    ingresos_ventas: ven,
    ingresos_totales: ven !== null ? ven + (num(data["403"]) ?? 0) : null,
    costos_ventas_prod: cost,
    utilidad_neta: num(data["707"]),
    liquidez_corriente: ac !== null && pc !== null && pc > 0 ? ac / pc : null,
    margen_bruto: ven !== null && ven > 0 && cost !== null && cost > 0 ? (ven - cost) / ven : null,
    rot_ventas: ven !== null && ven > 0 ? ven / act : null,
    sin_detalle_operacional: 1,
  };
}
