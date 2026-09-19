import { DIRECTION } from "@/lib/star";
import { formatCompactMoney, formatMoney, formatNumber, formatPercent, formatRatioValue } from "@/lib/format";
import type { RatioDist } from "@/lib/db";
import { isNum } from "@/lib/chartMath";
import type { Ctx } from "@/lib/report/model";

// Toda la redacción del informe sale de reglas con umbrales explícitos sobre los datos: no hay texto libre
// ni cifras que no estén en la fuente.

export function fmtR(key: string, v: number | null | undefined): string {
  if (!isNum(v as number)) return "—";
  const x = v as number;
  if (key === "end_activo" || key === "fortaleza_patrimonial") return formatPercent(x, 0);
  if (key === "cobertura_ebitda" || key === "cobertura_interes" || key === "deuda_neta_ebitda") return `${formatNumber(x, 1)} veces`;
  if (key === "apalancamiento" || key === "dp_apalancamiento" || key === "rot_ventas" || key === "dp_rotacion" || key === "liquidez_corriente" || key === "prueba_acida" || key === "razon_inmediata")
    return `${formatNumber(x, 2)}${key === "liquidez_corriente" || key === "prueba_acida" || key === "razon_inmediata" ? "" : " veces"}`;
  return formatRatioValue(key, x, 1);
}

const pctOf = (d: RatioDist | undefined | null): number | null => (d && d.own !== null && d.n >= 10 ? (d.below / d.n) * 100 : null);

// Porcentaje de pares a los que la empresa supera en sentido favorable (mayor o menor según el ratio).
export function favorability(key: string, d: RatioDist | undefined | null): number | null {
  const p = pctOf(d);
  const dir = DIRECTION[key] ?? "neutral";
  if (p === null || dir === "neutral") return null;
  return dir === "higher" ? p : 100 - p;
}

const last = (a: (number | null)[]) => {
  for (let i = a.length - 1; i >= 0; i--) if (isNum(a[i] as number)) return { i, v: a[i] as number };
  return null;
};
const first = (a: (number | null)[]) => {
  for (let i = 0; i < a.length; i++) if (isNum(a[i] as number)) return { i, v: a[i] as number };
  return null;
};
const change = (a: number, b: number) => (a > 0 ? b / a - 1 : null);
const upDown = (c: number, up: string, down: string) => (c >= 0 ? up : down);

export function headline(c: Ctx): string {
  const m = c.b.m;
  const ing = c.num(m.ingresos_ventas);
  const prev = c.num(c.b.prevYear?.metrics.ingresos_ventas);
  const uti = c.num(m.utilidad_neta);
  const act = c.num(m.activos);
  const pat = c.num(m.patrimonio);
  const parts: string[] = [];
  if (c.b.inactive) {
    return `${c.pretty} no reportó actividad operativa en ${c.year} (ingresos inferiores a US$ 1.000). El informe presenta sus estados financieros y la estructura de su balance; no se calculan comparaciones sectoriales.`;
  }
  let s = `${c.pretty} cerró ${c.year} con ingresos de ${formatMoney(ing)}`;
  const ch = ing !== null && prev !== null ? change(prev, ing) : null;
  if (ch !== null) s += `, ${formatPercent(Math.abs(ch), 1)} ${upDown(ch, "más", "menos")} que en ${c.year - 1}`;
  parts.push(s);
  if (uti !== null && ing) {
    parts.push(
      uti >= 0
        ? `una utilidad neta de ${formatMoney(uti)} (margen neto de ${formatPercent(uti / ing, 1)})`
        : `una pérdida neta de ${formatMoney(Math.abs(uti))} (margen neto de ${formatPercent(uti / ing, 1)})`,
    );
  }
  let out = parts.join(" y ") + ".";
  if (act && pat !== null) {
    out +=
      pat < 0
        ? ` Su patrimonio es negativo (${formatMoney(pat)}): las deudas superan a los activos.`
        : ` El patrimonio financia el ${formatPercent(pat / act, 0)} de sus activos de ${formatMoney(act)}.`;
  }
  if (c.b.score.grado) {
    out += ` Su puntaje orientativo de capacidad de pago es ${c.b.score.grado} (${c.b.score.etiqueta.toLowerCase()}), ${c.b.score.total}/100.`;
  }
  return out;
}

const LABEL: Record<string, string> = {
  rent_neta_ventas: "Margen neto",
  margen_bruto: "Margen bruto",
  margen_operacional: "Margen operacional",
  margen_ebitda: "Margen EBITDA",
  roe: "ROE",
  roa: "ROA",
  roic: "ROIC",
  liquidez_corriente: "Razón corriente",
  prueba_acida: "Prueba ácida",
  end_activo: "Endeudamiento del activo",
  cobertura_ebitda: "Cobertura de intereses (EBITDA)",
  deuda_neta_ebitda: "Deuda neta / EBITDA",
  rot_ventas: "Rotación de activos",
  ccc: "Ciclo de conversión de efectivo",
  per_med_cobranza: "Días de cobro (DSO)",
};
export const RATIO_LABEL = LABEL;

export function strengthsAndAttention(c: Ctx): { strengths: string[]; attention: string[] } {
  const dist = c.b.dist;
  const scored = Object.keys(LABEL)
    .map((k) => ({ k, fav: favorability(k, dist[k]), d: dist[k] }))
    .filter((x) => x.fav !== null && x.d);
  const line = (x: { k: string; fav: number | null; d: RatioDist }) =>
    `${LABEL[x.k]}: ${fmtR(x.k, x.d.own)}, frente a una mediana de ${fmtR(x.k, x.d.median)} entre sus pares; mejor que el ${Math.round(x.fav as number)}% de ellos.`;
  const strengths = scored
    .filter((x) => (x.fav as number) >= 70)
    .sort((a, b) => (b.fav as number) - (a.fav as number))
    .slice(0, 3)
    .map((x) => line(x as never));
  const attention = scored
    .filter((x) => (x.fav as number) <= 30)
    .sort((a, b) => (a.fav as number) - (b.fav as number))
    .slice(0, 4)
    .map((x) => line(x as never).replace("mejor que el", "solo supera al").replace(" de ellos.", " de ellos."));
  const flagLines = c.b.flags.filter((f) => f.severity !== "info").map((f) => f.titulo + (f.evidencia ? `: ${f.evidencia}` : "."));
  const merged = [...flagLines, ...attention].slice(0, 4);
  return {
    strengths: strengths.length ? strengths : ["No se identifican indicadores claramente destacados frente a sus pares."],
    attention: merged.length ? merged : ["No se identifican indicadores claramente rezagados ni alertas de control con las reglas aplicadas."],
  };
}

export function statementLead(c: Ctx, kind: "esf" | "eri"): string {
  const m = c.b.m;
  const p = c.b.prevYear?.metrics;
  const act = c.num(m.activos);
  const pat = c.num(m.patrimonio);
  if (kind === "esf") {
    if (!act) return `Estado de situación financiera de ${c.pretty}: no hay cifras de activos para ${c.year}.`;
    const pas = pat !== null ? act - pat : null;
    const pa = c.num(p?.activos);
    let s = `Al cierre de ${c.year}, los activos suman ${formatMoney(act)}`;
    if (pa) s += ` (${formatPercent(Math.abs(act / pa - 1), 1)} ${upDown(act / pa - 1, "más", "menos")} que en ${c.year - 1})`;
    if (pas !== null && pat !== null)
      s += pat < 0 ? `; el patrimonio es negativo (${formatMoney(pat)}) y los pasivos superan a los activos.` : `; el ${formatPercent(pas / act, 0)} se financia con pasivos y el ${formatPercent(pat / act, 0)} con patrimonio.`;
    else s += ".";
    return s;
  }
  const ing = c.num(m.ingresos_ventas);
  const uti = c.num(m.utilidad_neta);
  if (!ing) return `Estado de resultado integral de ${c.pretty}: no hay ingresos operacionales reportados para ${c.year}.`;
  const pi = c.num(p?.ingresos_ventas);
  let s = `En ${c.year}, los ingresos operacionales fueron ${formatMoney(ing)}`;
  if (pi) s += ` (${formatPercent(Math.abs(ing / pi - 1), 1)} ${upDown(ing / pi - 1, "más", "menos")} que en ${c.year - 1})`;
  if (uti !== null) s += `; el resultado neto fue ${uti >= 0 ? "una utilidad" : "una pérdida"} de ${formatMoney(Math.abs(uti))}, con un margen neto de ${formatPercent(uti / ing, 1)}.`;
  else s += ".";
  return s;
}

export function trajectoryTitle(c: Ctx): string {
  const ing = c.met("ingresos_ventas");
  const uti = c.met("utilidad_neta");
  const f = first(ing);
  const l = last(ing);
  if (!f || !l || f.i === l.i) return "Evolución de ingresos y utilidad neta";
  const ci = change(f.v, l.v);
  let s = ci === null ? "Evolución de ingresos y utilidad neta" : `Los ingresos ${upDown(ci, "crecieron", "cayeron")} ${formatPercent(Math.abs(ci), 0)} entre ${c.years[f.i]} y ${c.years[l.i]}`;
  const uf = first(uti);
  const ul = last(uti);
  if (ci !== null && uf && ul && uf.i !== ul.i) {
    if (uf.v > 0 && ul.v > 0) {
      const cu = ul.v / uf.v - 1;
      s += `; la utilidad neta, ${cu >= 0 ? "" : "-"}${formatPercent(Math.abs(cu), 0)}`;
    } else s += `; la utilidad neta pasó de ${formatCompactMoney(uf.v)} a ${formatCompactMoney(ul.v)}`;
  }
  return s;
}

export function trajectoryReading(c: Ctx): string {
  const ing = c.met("ingresos_ventas");
  const f = first(ing);
  const l = last(ing);
  if (!f || !l || f.i === l.i || f.v <= 0) return "No hay suficiente historial de ingresos para describir una trayectoria.";
  const n = c.years[l.i] - c.years[f.i];
  const cagr = Math.pow(l.v / f.v, 1 / n) - 1;
  let s = `Entre ${c.years[f.i]} y ${c.years[l.i]} los ingresos ${upDown(cagr, "crecieron", "decrecieron")} a un ritmo compuesto anual de ${formatPercent(Math.abs(cagr), 1)}, de ${formatCompactMoney(f.v)} a ${formatCompactMoney(l.v)}.`;
  const vals = ing.map((v, i) => ({ v, i })).filter((x) => isNum(x.v as number)) as { v: number; i: number }[];
  const min = vals.reduce((a, b) => (b.v < a.v ? b : a), vals[0]);
  if (min.i !== f.i && min.i !== l.i) {
    s += ` El nivel más bajo se registró en ${c.years[min.i]} (${formatCompactMoney(min.v)})${c.years[min.i] === 2020 ? ", año de la pandemia de COVID-19" : ""}.`;
  }
  const emp = c.num(c.b.m.n_empleados);
  const prodSeries = c.years.map((y, i) => {
    const e = c.num(c.b.filled.find((f2) => f2.anio === y)?.metrics.n_empleados);
    return e && e > 0 && isNum(ing[i] as number) ? (ing[i] as number) / e : null;
  });
  const pl = last(prodSeries);
  if (emp && pl) s += ` Con ${formatNumber(emp, 0)} empleados reportados en ${c.year}, cada uno equivale a ${formatCompactMoney(pl.v)} de ingresos.`;
  return s;
}

export function profitabilityTitle(c: Ctx): string {
  const roe = c.val("roe");
  const f = first(roe);
  const l = last(roe);
  if (!l) return "Rentabilidad";
  if (!f || f.i === l.i) return `El ROE de ${c.years[l.i]} es ${formatPercent(l.v, 1)}`;
  return `El ROE pasó de ${formatPercent(f.v, 1)} en ${c.years[f.i]} a ${formatPercent(l.v, 1)} en ${c.years[l.i]}`;
}

export function profitabilityReading(c: Ctx): string {
  const v = c.b.curValues;
  const roe = c.num(v.roe);
  const roa = c.num(v.roa);
  const ap = c.num(v.dp_apalancamiento);
  const mn = c.num(v.rent_neta_ventas);
  const rot = c.num(v.dp_rotacion);
  if (roe === null && roa === null) return "No es posible calcular la rentabilidad del patrimonio (patrimonio no positivo o sin utilidad reportada).";
  let s = "";
  if (roe !== null && roa !== null && ap !== null)
    s += `El ROE de ${formatPercent(roe, 1)} resulta de un ROA de ${formatPercent(roa, 1)} multiplicado por un apalancamiento de ${formatNumber(ap, 2)} veces (activos ÷ patrimonio).`;
  else if (roa !== null) s += `El ROA de ${formatPercent(roa, 1)} indica la utilidad neta generada por cada dólar de activos.`;
  if (mn !== null && rot !== null) s += ` A su vez, el ROA combina un margen neto de ${formatPercent(mn, 1)} con una rotación de activos de ${formatNumber(rot, 2)} veces.`;
  if (ap !== null && ap >= 4 && roe !== null) s += " Un apalancamiento elevado amplifica el ROE: parte del rendimiento del patrimonio proviene del uso de deuda y no solo de la operación.";
  const e = c.num(v.margen_ebitda);
  if (e !== null) s += ` El margen EBITDA aproximado es ${formatPercent(e, 1)}; la depreciación y amortización que reporta la fuente puede ser incompleta.`;
  return s;
}

export function liquidityTitle(c: Ctx): string {
  const r = c.num(c.b.curValues.liquidez_corriente);
  if (r === null) return "Liquidez y ciclo de efectivo";
  return r >= 1.5
    ? `La razón corriente de ${formatNumber(r, 2)} cubre holgadamente las deudas de corto plazo`
    : r >= 1
      ? `La razón corriente de ${formatNumber(r, 2)} cubre las deudas de corto plazo con margen ajustado`
      : `La razón corriente de ${formatNumber(r, 2)} no alcanza a cubrir las deudas de corto plazo`;
}

export function liquidityReading(c: Ctx): string {
  const v = c.b.curValues;
  const r = c.num(v.liquidez_corriente);
  const q = c.num(v.prueba_acida);
  const ccc = c.num(v.ccc);
  const dso = c.num(v.per_med_cobranza);
  const dio = c.num(v.dio);
  const dpo = c.num(v.per_med_pago);
  let s = "";
  if (r !== null) s += `Por cada dólar de deuda de corto plazo la empresa dispone de US$ ${formatNumber(r, 2)} en activos corrientes${q !== null ? ` (US$ ${formatNumber(q, 2)} sin inventarios)` : ""}.`;
  if (ccc !== null && dso !== null && dio !== null && dpo !== null)
    s += ` El ciclo de conversión de efectivo es de ${formatNumber(ccc, 0)} días: ${formatNumber(dso, 0)} de cobro + ${formatNumber(dio, 0)} de inventario − ${formatNumber(dpo, 0)} de pago a proveedores.`;
  else s += " El ciclo de efectivo requiere balance NIIF con inventarios y costo de ventas; no está disponible para este año.";
  return s;
}

export function solvencyReading(c: Ctx): string {
  const v = c.b.curValues;
  const ea = c.num(v.end_activo);
  const cov = c.num(v.cobertura_ebitda) ?? c.num(v.cobertura_interes);
  const dn = c.num(v.deuda_neta);
  const dne = c.num(v.deuda_neta_ebitda);
  let s = "";
  if (ea !== null) s += `Los pasivos representan el ${formatPercent(ea, 0)} de los activos${ea > 0.7 ? ", un nivel de endeudamiento alto" : ea < 0.4 ? ", un nivel de endeudamiento bajo" : ""}.`;
  if (cov !== null) s += ` La utilidad operativa cubre ${formatNumber(cov, 1)} veces los gastos financieros.`;
  else if (c.num(c.b.m.gastos_financieros) === 0) s += " No se reportan gastos financieros.";
  if (dn !== null && dn <= 0) s += " La empresa mantiene más efectivo que deuda financiera.";
  else if (dne !== null) s += ` La deuda financiera neta equivale a ${formatNumber(dne, 1)} años de EBITDA.`;
  return s.trim() || "No hay información suficiente para evaluar la solvencia.";
}

export function peersTitle(c: Ctx): string {
  const items = Object.keys(LABEL).map((k) => favorability(k, c.b.dist[k])).filter((x): x is number => x !== null);
  if (items.length === 0) return "Comparación con empresas similares";
  const good = items.filter((x) => x >= 60).length;
  return `La empresa está en la zona favorable en ${good} de ${items.length} indicadores frente a sus pares`;
}

export function peersReading(c: Ctx): string {
  const g = c.b.peerGroup;
  if (!g) return "No hay suficientes datos de actividad para armar un grupo de comparables en este año.";
  const items = Object.keys(LABEL).map((k) => favorability(k, c.b.dist[k])).filter((x): x is number => x !== null);
  const good = items.filter((x) => x >= 60).length;
  const bad = items.filter((x) => x <= 33).length;
  return (
    `La referencia son las ${formatNumber(g.benchmark.n, 0)} empresas activas más cercanas en ingresos dentro de la ${g.levelLabel} (CIIU ${g.prefix}), de un total de ${formatNumber(g.total, 0)}. ` +
    `Por ingresos, ${c.pretty} ocupa el puesto ${g.sizeRank} de ${g.total + 1}. De ${items.length} indicadores con referencia, ${good} están en la zona favorable, ${items.length - good - bad} en la intermedia y ${bad} en la desfavorable.`
  );
}

export function riskReading(c: Ctx): string {
  const s = c.b.score;
  if (!s.grado) return "No hay datos suficientes para calcular el puntaje orientativo de capacidad de pago.";
  const alta = c.b.flags.filter((f) => f.severity === "alta").length;
  const media = c.b.flags.filter((f) => f.severity === "media").length;
  return (
    `El puntaje orientativo es ${s.total}/100 (grado ${s.grado}: ${s.etiqueta.toLowerCase()}). ` +
    (alta + media === 0 ? "No se detectaron alertas de control de severidad alta o media." : `Se detectaron ${alta} alerta(s) de severidad alta y ${media} de severidad media.`)
  );
}

export function riskTitle(c: Ctx): string {
  const s = c.b.score;
  if (!s.grado) return "Riesgo y capacidad de pago";
  return `Capacidad de pago ${s.etiqueta.toLowerCase()}: grado ${s.grado}, ${s.total} de 100 puntos`;
}

// Formato breve para etiquetas de gráficos.
export function fmrShort(key: string, v: number): string {
  if (["end_activo", "margen_bruto", "margen_operacional", "margen_ebitda", "rent_neta_ventas", "roe", "roa", "roic"].includes(key)) return formatPercent(v, key === "end_activo" ? 0 : 1);
  return formatNumber(v, 2);
}
