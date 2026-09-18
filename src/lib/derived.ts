import type { Metrics } from "@/lib/db";

// bi_ranking publica los ratios redondeados a 2 decimales (y margen/rentabilidad operacional
// vienen mal definidos en muchos casos), por eso los ratios de comparables se recalculan
// a partir de las cifras exactas de la misma fila.
export function derivedRatios(m: Metrics): Record<string, number | null> {
  const un = m.utilidad_neta;
  const pat = m.patrimonio;
  const act = m.activos;
  const ing = m.ingresos_totales ?? m.ingresos_ventas;
  const ok = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);
  return {
    roe: ok(un) && ok(pat) && pat > 0 ? un / pat : null,
    roa: ok(un) && ok(act) && act > 0 ? un / act : null,
    rent_neta_ventas: ok(un) && ok(ing) && ing > 0 ? un / ing : null,
    margen_bruto: ok(m.margen_bruto) ? m.margen_bruto : null,
    liquidez_corriente: ok(m.liquidez_corriente) ? m.liquidez_corriente : null,
    end_activo: ok(act) && ok(pat) && act > 0 ? (act - pat) / act : null,
  };
}
