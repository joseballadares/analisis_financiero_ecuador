import type { Metrics } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatCompactMoney, formatNumber, formatPercent } from "@/lib/format";

type Data = Record<string, number>;
export type Severity = "alta" | "media" | "info";
export type RiskFlag = { id: string; severity: Severity; titulo: string; detalle: string; evidencia?: string };
export type ScoreComponent = {
  id: string;
  label: string;
  peso: number;
  puntaje: number | null;
  valor: string;
  regla: string;
};
export type CreditScore = {
  total: number | null;
  grado: "A" | "B" | "C" | "D" | "E" | null;
  etiqueta: string;
  componentes: ScoreComponent[];
};

const ok = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);
const num = (x: number | null | undefined) => (ok(x) ? x : null);

// Puntaje de un valor según umbrales ordenados: [límite, puntaje]; se toma el primero que se cumple.
function bands(v: number, rules: [number, number][], otherwise: number, higherIsBetter = true): number {
  for (const [limit, score] of rules) if (higherIsBetter ? v >= limit : v <= limit) return score;
  return otherwise;
}

export function creditScore(params: {
  values: Record<string, number | null>;
  m: Metrics;
  history: { anio: number; utilidad: number | null }[];
}): CreditScore {
  const { values: v, m, history } = params;
  const comps: ScoreComponent[] = [];
  const add = (c: ScoreComponent) => comps.push(c);

  const liq = num(v.liquidez_corriente);
  add({
    id: "liquidez",
    label: "Liquidez",
    peso: 20,
    puntaje: liq === null ? null : bands(liq, [[1.5, 100], [1.2, 80], [1.0, 60], [0.8, 35]], 10),
    valor: liq === null ? "—" : `${formatNumber(liq, 2)} veces`,
    regla: "Razón corriente: 1,5 o más = 100; 1,2 = 80; 1,0 = 60; 0,8 = 35; menos = 10.",
  });

  const pat = num(m.patrimonio);
  const endA = num(v.end_activo);
  add({
    id: "endeudamiento",
    label: "Endeudamiento",
    peso: 20,
    puntaje: endA === null ? null : pat !== null && pat < 0 ? 0 : bands(endA, [[0.4, 100], [0.55, 80], [0.7, 60], [0.85, 35]], 10, false),
    valor: endA === null ? "—" : formatPercent(endA, 0) + " del activo",
    regla: "Pasivo ÷ activo: hasta 40% = 100; 55% = 80; 70% = 60; 85% = 35; más = 10; patrimonio negativo = 0.",
  });

  const gf = num(m.gastos_financieros);
  const cov = num(v.cobertura_ebitda) ?? num(v.cobertura_interes);
  let covScore: number | null = null;
  let covValor = "—";
  if (gf !== null && gf <= 0) {
    covScore = 100;
    covValor = "sin gastos financieros";
  } else if (cov !== null) {
    covScore = bands(cov, [[6, 100], [3, 80], [1.5, 60], [1, 35]], 10);
    covValor = `${formatNumber(cov, 1)} veces`;
  }
  add({
    id: "cobertura",
    label: "Cobertura de intereses",
    peso: 20,
    puntaje: covScore,
    valor: covValor,
    regla: "EBITDA (o utilidad operacional) ÷ gastos financieros: 6 o más = 100; 3 = 80; 1,5 = 60; 1 = 35; menos = 10.",
  });

  const nd = num(v.deuda_neta);
  const dne = num(v.deuda_neta_ebitda);
  let ndScore: number | null = null;
  let ndValor = "—";
  if (nd !== null && nd <= 0) {
    ndScore = 100;
    ndValor = "más efectivo que deuda";
  } else if (dne !== null) {
    ndScore = bands(dne, [[1, 100], [2, 85], [3, 65], [4, 40]], 15, false);
    ndValor = `${formatNumber(dne, 1)} años de EBITDA`;
  } else if (nd !== null && nd > 0) {
    ndScore = 0;
    ndValor = "deuda con EBITDA no positivo";
  }
  add({
    id: "deuda",
    label: "Deuda neta / EBITDA",
    peso: 10,
    puntaje: ndScore,
    valor: ndValor,
    regla: "Años de EBITDA para pagar la deuda neta: hasta 1 = 100; 2 = 85; 3 = 65; 4 = 40; más = 15. Solo con balance NIIF.",
  });

  const roa = num(v.roa);
  add({
    id: "rentabilidad",
    label: "Rentabilidad (ROA)",
    peso: 15,
    puntaje: roa === null ? null : bands(roa, [[0.08, 100], [0.04, 80], [0.01, 60], [0, 35]], 10),
    valor: roa === null ? "—" : formatPercent(roa, 1),
    regla: "Utilidad neta ÷ activos: 8% o más = 100; 4% = 80; 1% = 60; 0% = 35; pérdida = 10.",
  });

  const last3 = history.slice(-3).filter((h) => h.utilidad !== null);
  const pos = last3.filter((h) => (h.utilidad as number) > 0).length;
  add({
    id: "consistencia",
    label: "Consistencia de utilidades",
    peso: 15,
    puntaje: last3.length === 0 ? null : [10, 40, 70, 100][Math.min(pos, 3)],
    valor: last3.length === 0 ? "—" : `${pos} de ${last3.length} años con utilidad`,
    regla: "Años con utilidad neta positiva en los últimos tres: 3 = 100; 2 = 70; 1 = 40; 0 = 10.",
  });

  const avail = comps.filter((c) => c.puntaje !== null);
  const wsum = avail.reduce((a, c) => a + c.peso, 0);
  if (avail.length < 3 || wsum === 0) {
    return { total: null, grado: null, etiqueta: "Sin datos suficientes para calcularlo", componentes: comps };
  }
  const total = Math.round(avail.reduce((a, c) => a + (c.puntaje as number) * c.peso, 0) / wsum);
  const grado = total >= 80 ? "A" : total >= 65 ? "B" : total >= 50 ? "C" : total >= 35 ? "D" : "E";
  const etiqueta = { A: "Riesgo bajo", B: "Riesgo moderado-bajo", C: "Riesgo moderado", D: "Riesgo alto", E: "Riesgo muy alto" }[grado];
  return { total, grado, etiqueta, componentes: comps };
}

const sev = (s: Severity) => ({ alta: 0, media: 1, info: 2 })[s];

export function riskFlags(params: {
  year: number;
  m: Metrics;
  prevM?: Metrics;
  values: Record<string, number | null>;
  prevValues?: Record<string, number | null>;
  niif?: Data;
  prevNiif?: Data;
  history: { anio: number; utilidad: number | null }[];
}): RiskFlag[] {
  const { year, m, prevM, values: v, prevValues: pv, niif, prevNiif, history } = params;
  const out: RiskFlag[] = [];
  const push = (f: RiskFlag) => out.push(f);
  const pat = num(m.patrimonio);
  const act = num(m.activos);
  const ven = ok(m.ingresos_ventas) && m.ingresos_ventas > 0 ? m.ingresos_ventas : num(m.ingresos_totales);
  const un = num(m.utilidad_neta);

  if (pat !== null && pat < 0) {
    push({
      id: "patrimonio_negativo",
      severity: "alta",
      titulo: "Patrimonio negativo",
      detalle: "Los pasivos superan a los activos: el patrimonio contable es negativo.",
      evidencia: `Patrimonio ${formatCompactMoney(pat)}${act ? ` (${formatPercent(pat / act, 0)} del activo)` : ""}.`,
    });
  }
  const capital = niif ? num(niif["301"]) : null;
  if (pat !== null && pat >= 0 && capital !== null && capital > 0 && pat < 0.5 * capital) {
    push({
      id: "patrimonio_bajo_capital",
      severity: "alta",
      titulo: "Patrimonio inferior al 50% del capital social",
      detalle:
        "Se observa un patrimonio menor a la mitad del capital suscrito. La Ley de Compañías contempla situaciones de este tipo como posible causal de disolución si las pérdidas no se cubren; conviene verificar la situación societaria.",
      evidencia: `Patrimonio ${formatCompactMoney(pat)} frente a un capital de ${formatCompactMoney(capital)} (${formatPercent(pat / capital, 0)}).`,
    });
  }
  const liq = num(v.liquidez_corriente);
  if (liq !== null && liq < 1) {
    push({
      id: "liquidez",
      severity: liq < 0.6 ? "alta" : "media",
      titulo: "Liquidez corriente inferior a 1",
      detalle: "Los activos corrientes no alcanzan a cubrir los pasivos corrientes: presión sobre el capital de trabajo.",
      evidencia: `Razón corriente de ${formatNumber(liq, 2)}.`,
    });
  }
  if (un !== null && un < 0) {
    const prevLoss = history.find((h) => h.anio === year - 1)?.utilidad;
    const two = ok(prevLoss) && prevLoss < 0;
    push({
      id: "perdidas",
      severity: two ? "alta" : "media",
      titulo: two ? "Pérdidas en dos años consecutivos" : "Pérdida neta en el año",
      detalle: two
        ? "El resultado neto fue negativo este año y el anterior, lo que erosiona el patrimonio."
        : "El resultado neto del año fue negativo.",
      evidencia: `Utilidad neta ${formatCompactMoney(un)}${ven ? ` (${formatPercent(un / ven, 1)} de los ingresos)` : ""}.`,
    });
  }
  const pVen = prevM ? (ok(prevM.ingresos_ventas) && prevM.ingresos_ventas > 0 ? prevM.ingresos_ventas : null) : null;
  if (ven && pVen && ven / pVen - 1 < -0.3) {
    push({
      id: "caida_ingresos",
      severity: "media",
      titulo: "Caída fuerte de ingresos",
      detalle: "Los ingresos cayeron más de 30% frente al año anterior; conviene entender la causa (cliente clave, pérdida de mercado, cambio de actividad).",
      evidencia: `De ${formatCompactMoney(pVen)} a ${formatCompactMoney(ven)} (${formatPercent(ven / pVen - 1, 0)}).`,
    });
  }
  if (niif && prevNiif && ven && pVen) {
    const cxc = (d: Data) => (d["1010205"] ?? 0) + (d["1010206"] ?? 0);
    const cxc0 = cxc(prevNiif);
    if (cxc0 > 0) {
      const gCxc = cxc(niif) / cxc0 - 1;
      const gVen = ven / pVen - 1;
      if (gCxc - gVen > 0.2 && cxc(niif) > 0) {
        push({
          id: "cxc_vs_ventas",
          severity: "media",
          titulo: "Cuentas por cobrar crecen más que las ventas",
          detalle: "La cartera aumenta a un ritmo claramente mayor que los ingresos: posible relajamiento de crédito o cobranza más lenta.",
          evidencia: `Cartera ${formatPercent(gCxc, 0)} frente a ingresos ${formatPercent(gVen, 0)}.`,
        });
      }
    }
    const inv0 = prevNiif["10103"] ?? 0;
    const cost0 = prevNiif["501"] ?? 0;
    const cost1 = niif["501"] ?? 0;
    if (inv0 > 0 && cost0 > 0 && cost1 > 0) {
      const gInv = (niif["10103"] ?? 0) / inv0 - 1;
      const gCost = cost1 / cost0 - 1;
      if (gInv - gCost > 0.2) {
        push({
          id: "inventario_vs_costo",
          severity: "media",
          titulo: "Inventarios crecen más que el costo de ventas",
          detalle: "Los inventarios aumentan más rápido que la actividad: posible acumulación o menor rotación.",
          evidencia: `Inventarios ${formatPercent(gInv, 0)} frente a costo de ventas ${formatPercent(gCost, 0)}.`,
        });
      }
    }
  }
  const uai = num(m.utilidad_an_imp);
  const tax = num(m.impuesto_renta);
  if (uai !== null && uai > 50_000 && tax !== null) {
    const t = tax / uai;
    if (t > 0.4 || t < 0.1) {
      push({
        id: "tasa_efectiva",
        severity: "info",
        titulo: "Tasa efectiva de impuesto atípica",
        detalle: "La tasa efectiva se aleja de la tarifa general (25%); puede deberse a gastos no deducibles, beneficios tributarios o exoneraciones.",
        evidencia: `Impuesto a la renta de ${formatPercent(t, 0)} de la utilidad antes de impuestos.`,
      });
    }
  }
  if (niif && act && act > 0) {
    const rel = num(niif["1010206"]);
    if (rel !== null && rel / act > 0.2) {
      push({
        id: "cxc_relacionadas",
        severity: "media",
        titulo: "Cuentas por cobrar a relacionadas relevantes",
        detalle: "Una parte importante del activo son saldos por cobrar a partes relacionadas.",
        evidencia: `${formatPercent(rel / act, 0)} del activo (${formatCompactMoney(rel)}).`,
      });
    }
    const pas = niif["2"];
    const relP = (niif["20108"] ?? 0) + (niif["20204"] ?? 0);
    if (ok(pas) && pas > 0 && relP / pas > 0.3) {
      push({
        id: "cxp_relacionadas",
        severity: "info",
        titulo: "Cuentas por pagar a relacionadas relevantes",
        detalle: "Buena parte del pasivo es con partes relacionadas.",
        evidencia: `${formatPercent(relP / pas, 0)} del pasivo (${formatCompactMoney(relP)}).`,
      });
    }
    const a1 = niif["1"];
    const l2 = niif["2"];
    const e3 = niif["3"];
    if (ok(a1) && ok(l2) && ok(e3) && a1 > 0 && Math.abs(a1 - (l2 + e3)) / a1 > 0.005) {
      push({
        id: "descuadre",
        severity: "info",
        titulo: "El balance no cuadra exactamente",
        detalle: "Activo y pasivo más patrimonio difieren en más de 0,5%; puede haber cuentas no reportadas en el detalle.",
        evidencia: `Diferencia de ${formatCompactMoney(a1 - (l2 + e3))}.`,
      });
    }
  }
  const cov = num(v.cobertura_interes);
  if (cov !== null && cov < 1.5 && num(m.gastos_financieros) !== null && (m.gastos_financieros as number) > 0) {
    push({
      id: "cobertura",
      severity: cov < 1 ? "alta" : "media",
      titulo: "Cobertura de intereses débil",
      detalle: cov < 1 ? "La utilidad operacional no alcanza a cubrir los gastos financieros." : "La utilidad operacional cubre los intereses con poco margen.",
      evidencia: `Cobertura de ${formatNumber(cov, 1)} veces.`,
    });
  }
  const dne = num(v.deuda_neta_ebitda);
  if (dne !== null && dne > 4) {
    push({
      id: "apalancamiento",
      severity: "media",
      titulo: "Deuda neta elevada frente al EBITDA",
      detalle: "Se necesitarían más de cuatro años de EBITDA para pagar la deuda neta (el EBITDA es aproximado y puede estar subestimado).",
      evidencia: `${formatNumber(dne, 1)} veces el EBITDA.`,
    });
  }
  const fcf = num(v.fcf);
  const pfcf = pv ? num(pv.fcf) : null;
  if (un !== null && un > 0 && fcf !== null && fcf < 0 && pfcf !== null && pfcf < 0 && history.find((h) => h.anio === year - 1)?.utilidad !== null) {
    const pu = history.find((h) => h.anio === year - 1)?.utilidad;
    if (ok(pu) && pu > 0) {
      push({
        id: "calidad_utilidades",
        severity: "media",
        titulo: "Utilidad que no se convierte en caja",
        detalle: "Hay utilidad neta positiva pero el flujo de caja libre estimado es negativo dos años seguidos; conviene revisar capital de trabajo e inversiones.",
        evidencia: `FCF estimado ${formatCompactMoney(fcf)} este año y ${formatCompactMoney(pfcf)} el anterior.`,
      });
    }
  }
  const dso = num(v.per_med_cobranza);
  if (dso !== null && dso > 120) {
    push({
      id: "cobranza",
      severity: "info",
      titulo: "Cobranza lenta",
      detalle: "Los clientes tardan más de 120 días en pagar en promedio.",
      evidencia: `${formatNumber(dso, 0)} días de cobro.`,
    });
  }
  const emp = num(m.n_empleados);
  const pemp = prevM ? num(prevM.n_empleados) : null;
  if (emp !== null && pemp !== null && pemp >= 20 && Math.abs(emp / pemp - 1) > 0.3) {
    push({
      id: "empleados",
      severity: "info",
      titulo: "Cambio brusco en el número de empleados",
      detalle: "La plantilla varió más de 30% frente al año anterior.",
      evidencia: `De ${formatNumber(pemp, 0)} a ${formatNumber(emp, 0)} empleados.`,
    });
  }
  if (m.sin_detalle_operacional === 1) {
    push({
      id: "datos_parciales",
      severity: "info",
      titulo: "Datos operacionales incompletos",
      detalle: "Para este año la Superintendencia aún no trae el detalle de gastos; se calcularon las cifras principales desde el balance y algunas alertas no se pueden evaluar.",
    });
  }
  return out.sort((a, b) => sev(a.severity) - sev(b.severity));
}
