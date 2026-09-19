import { db, VEN, type Metrics } from "@/lib/db";
import { derivedRatios, isInactive, needsBalanceFill } from "@/lib/derived";
import { advancedRatios } from "@/lib/star";
import { memo } from "@/lib/queries";
import { formatNumber, formatPercent } from "@/lib/format";
import { SIGNALS, type Interesting, type InterestingPool, type Signal, type SignalId } from "@/lib/interestingMeta";

// Empresas interesantes: una selección editorial automatizada para leer sobre ellas y ver su evolución.
// No es una recomendación de inversión. Ventana de 5 años (anio-4 … anio). Reglas en /acerca.

const VEN_F = VEN.replace(/metrics/g, "f.metrics");
const POOL = 2000;
const TOP_SHARE = 0.9; // cada señal exige estar en el 10 % superior de las empresas elegibles

export { SIGNALS } from "@/lib/interestingMeta";
export type { SignalId, Signal, Interesting, InterestingPool } from "@/lib/interestingMeta";

const ok = (x: number | null | undefined): x is number => typeof x === "number" && Number.isFinite(x);
const ing = (m: Metrics): number => (ok(m.ingresos_ventas) && m.ingresos_ventas > 0 ? m.ingresos_ventas : ok(m.ingresos_totales) ? m.ingresos_totales : 0);

function quantile(values: number[], q: number): number {
  const a = [...values].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))))];
}

type Row = {
  expediente: number;
  anio: number;
  ciiu_n1: string | null;
  ciiu_n6: string | null;
  posicion_general: number | null;
  niif: boolean;
  metrics: Metrics;
  ruc: string | null;
  nombre: string;
};

async function compute(anio: number): Promise<InterestingPool> {
  const database = db();
  const desde = anio - 4;
  // Población: las POOL empresas con más ingresos operacionales del último año (una sola consulta; el balance NIIF
  // se comprueba con la llave primaria de balance_line_items).
  const rows = await database.sql<Row>`
    WITH pool AS (
      SELECT f.expediente FROM company_year_financials f
      WHERE f.anio = ${anio} AND ${database.sql.raw(VEN_F)} > 0
      ORDER BY ${database.sql.raw(VEN_F)} DESC LIMIT ${POOL}
    )
    SELECT f.expediente, f.anio, f.ciiu_n1, f.ciiu_n6, f.posicion_general, f.metrics, c.ruc, c.nombre,
           EXISTS (SELECT 1 FROM balance_line_items b WHERE b.expediente = f.expediente AND b.anio = ${anio} AND b.catalog_id = 3) AS niif
    FROM company_year_financials f
    JOIN pool p ON p.expediente = f.expediente
    JOIN companies c ON c.expediente = f.expediente
    WHERE f.anio BETWEEN ${desde} AND ${anio}
  `;

  const hasNiif = new Set(rows.filter((r) => r.niif).map((r) => r.expediente));
  const posOf = new Map<string, number>();
  for (const r of rows) if (r.posicion_general) posOf.set(`${r.expediente}:${r.anio}`, r.posicion_general);

  type Co = { expediente: number; ruc: string; nombre: string; sector: string | null; ciiu6: string | null; years: Map<number, Metrics> };
  const cos = new Map<number, Co>();
  for (const r of rows) {
    if (!r.ruc) continue;
    let c = cos.get(r.expediente);
    if (!c) cos.set(r.expediente, (c = { expediente: r.expediente, ruc: r.ruc, nombre: r.nombre, sector: null, ciiu6: null, years: new Map() }));
    c.years.set(r.anio, r.metrics);
    if (r.anio === anio) {
      c.sector = r.ciiu_n1;
      c.ciiu6 = r.ciiu_n6;
    }
  }

  // Población: las POOL empresas con más ingresos operacionales del último año.
  const byRevenue = [...cos.values()]
    .filter((c) => c.years.get(anio) && ing(c.years.get(anio) as Metrics) > 0)
    .sort((a, b) => ing(b.years.get(anio) as Metrics) - ing(a.years.get(anio) as Metrics))
    .slice(0, POOL);
  const revRank = new Map<number, number>(byRevenue.map((c, i) => [c.expediente, i + 1]));

  // Controles de calidad: datos completos y comparables en los 5 años.
  const excluidas = { sinCincoAnios: 0, sinNiif: 0, patrimonio: 0, inactivaOParcial: 0, holding: 0 };
  const eligible: Co[] = [];
  for (const c of byRevenue) {
    const m = c.years.get(anio) as Metrics;
    let full = true;
    for (let y = desde; y <= anio; y++) {
      const my = c.years.get(y);
      if (!my || !(ing(my) > 0)) full = false;
    }
    if (!full) {
      excluidas.sinCincoAnios++;
      continue;
    }
    if (!hasNiif.has(c.expediente)) {
      excluidas.sinNiif++;
      continue;
    }
    if (!ok(m.activos) || m.activos <= 0 || !ok(m.patrimonio) || m.patrimonio <= 0 || m.patrimonio / m.activos < 0.1) {
      excluidas.patrimonio++;
      continue;
    }
    if (isInactive(m) || needsBalanceFill(m) || m.sin_detalle_operacional === 1) {
      excluidas.inactivaOParcial++;
      continue;
    }
    if (c.ciiu6?.startsWith("K642")) {
      excluidas.holding++; // holdings: sus ratios no son comparables
      continue;
    }
    eligible.push(c);
  }

  type Cand = { co: Co; value: number; detail: string; tone: "up" | "down" };
  const lists: Record<SignalId, Cand[]> = { roe: [], ebitda: [], mejora: [], crecimiento: [], escalada: [], giro: [] };
  const pct = (v: number, d = 1) => formatPercent(v, d);
  const pp = (v: number) => `${v >= 0 ? "+" : "-"}${formatNumber(Math.abs(v) * 100, 1)} pp`;

  const ebitdaMargin = (m: Metrics | undefined): number | null => {
    if (!m || !((m.costos_ventas_prod ?? 0) > 0)) return null;
    if ((m.depreciaciones ?? 0) + (m.amortizaciones ?? 0) <= 0) return null; // EBITDA subestimado
    const v = advancedRatios(m).values.margen_ebitda;
    return ok(v) && v > -1 && v < 1 ? v : null;
  };

  for (const c of eligible) {
    const m = c.years.get(anio) as Metrics;

    // ROE promedio de 3 años
    const roes = [anio - 2, anio - 1, anio].map((y) => derivedRatios(c.years.get(y) as Metrics).roe);
    if (roes.every(ok) && m.patrimonio! / m.activos! >= 0.15) {
      const avg = (roes as number[]).reduce((a, b) => a + b, 0) / 3;
      if (avg > 0 && avg <= 1.5) lists.roe.push({ co: c, value: avg, detail: `ROE promedio ${anio - 2}–${anio}: ${pct(avg)}`, tone: "up" });
    }

    // Margen EBITDA del último año y su cambio desde 2022
    const e1 = ebitdaMargin(m);
    const e0 = ebitdaMargin(c.years.get(anio - 3));
    if (e1 !== null) lists.ebitda.push({ co: c, value: e1, detail: `Margen EBITDA ${anio}: ${pct(e1)}`, tone: "up" });
    if (e1 !== null && e0 !== null && e1 - e0 > 0.02) lists.mejora.push({ co: c, value: e1 - e0, detail: `Margen EBITDA ${pp(e1 - e0)} desde ${anio - 3} (${pct(e0)} a ${pct(e1)})`, tone: "up" });

    // Crecimiento sostenido de ingresos
    const i0 = ing(c.years.get(desde) as Metrics);
    const i1 = ing(m);
    let ups = 0;
    for (let y = desde + 1; y <= anio; y++) if (ing(c.years.get(y) as Metrics) > ing(c.years.get(y - 1) as Metrics)) ups++;
    const cagr = Math.pow(i1 / i0, 1 / 4) - 1;
    if (ups >= 3 && cagr > 0) lists.crecimiento.push({ co: c, value: cagr, detail: `Ingresos +${pct(cagr)} anual (${desde}–${anio})`, tone: "up" });

    // Puestos ganados en el ranking general de la Superintendencia
    const r0 = posOf.get(`${c.expediente}:${desde}`);
    const r1 = posOf.get(`${c.expediente}:${anio}`);
    if (r0 && r1 && r0 - r1 > 0) lists.escalada.push({ co: c, value: r0 - r1, detail: `Subió ${formatNumber(r0 - r1, 0)} puestos en el ranking de la Superintendencia desde ${desde} (del ${formatNumber(r0, 0)} al ${formatNumber(r1, 0)})`, tone: "up" });

    // Giro del margen neto
    const u0 = (c.years.get(desde) as Metrics).utilidad_neta;
    const u1 = m.utilidad_neta;
    if (ok(u0) && ok(u1)) {
      const mn0 = u0 / i0;
      const mn1 = u1 / i1;
      const d = mn1 - mn0;
      if (Math.abs(d) >= 0.03) {
        const txt = mn0 < 0 && mn1 > 0 ? "de pérdida a utilidad" : mn0 > 0 && mn1 < 0 ? "de utilidad a pérdida" : d > 0 ? "al alza" : "a la baja";
        lists.giro.push({ co: c, value: Math.abs(d), detail: `Margen neto ${txt}: ${pct(mn0)} en ${desde} a ${pct(mn1)} en ${anio}`, tone: d > 0 ? "up" : "down" });
      }
    }
  }

  // Umbral: 10 % superior de cada lista (en Operación eficiente, dentro de su sector cuando hay al menos 10 empresas).
  const chosen = new Map<number, Signal[]>();
  const add = (c: Cand, id: SignalId) => {
    const label = SIGNALS.find((s) => s.id === id)?.label ?? id;
    const arr = chosen.get(c.co.expediente) ?? [];
    arr.push({ id, label: id === "giro" && c.tone === "down" ? "Caída de utilidades" : label, detail: c.detail, tone: c.tone });
    chosen.set(c.co.expediente, arr);
  };
  const porSenal = { roe: 0, ebitda: 0, mejora: 0, crecimiento: 0, escalada: 0, giro: 0 } as Record<SignalId, number>;
  for (const id of Object.keys(lists) as SignalId[]) {
    const list = lists[id];
    if (list.length < 10) continue;
    if (id === "ebitda") {
      const bySector = new Map<string, Cand[]>();
      for (const c of list) bySector.set(c.co.sector ?? "?", [...(bySector.get(c.co.sector ?? "?") ?? []), c]);
      const global = quantile(list.map((c) => c.value), TOP_SHARE);
      for (const c of list) {
        const grp = bySector.get(c.co.sector ?? "?") as Cand[];
        const thr = grp.length >= 10 ? quantile(grp.map((x) => x.value), TOP_SHARE) : global;
        if (c.value >= thr) {
          add({ ...c, detail: `${c.detail} (top 10 % ${grp.length >= 10 ? "de su sector" : "general"})` }, id);
          porSenal[id]++;
        }
      }
      continue;
    }
    const thr = quantile(list.map((c) => c.value), TOP_SHARE);
    for (const c of list) {
      if (c.value >= thr) {
        add(c, id);
        porSenal[id]++;
      }
    }
  }

  const empresas: Interesting[] = [];
  for (const c of eligible) {
    const signals = chosen.get(c.expediente);
    if (!signals) continue;
    const m = c.years.get(anio) as Metrics;
    const d = derivedRatios(m);
    empresas.push({
      ruc: c.ruc,
      nombre: c.nombre,
      sector: c.sector,
      rank: revRank.get(c.expediente) ?? 0,
      ingresos: ing(m),
      activos: m.activos ?? null,
      utilidad: m.utilidad_neta ?? null,
      margen: d.rent_neta_ventas,
      roe: d.roe,
      signals,
    });
  }
  empresas.sort((a, b) => b.signals.length - a.signals.length || a.rank - b.rank);
  const dbg = `rows=${rows.length} exp=${new Set(rows.map((r) => r.expediente)).size} y${anio}=${rows.filter((r) => r.anio === anio).length} ruc=${rows.filter((r) => r.anio === anio && r.ruc).length} cos=${cos.size} ing=${byRevenue.length}`;
  return { anio, desde, evaluadas: byRevenue.length, elegibles: eligible.length, excluidas, porSenal, empresas, debug: dbg };
}

export function getInteresting(anio: number): Promise<InterestingPool> {
  return memo(`interesting:${anio}`, () => compute(anio));
}

// Ocho tarjetas para la portada: al menos una por señal, máximo 2 por sector y al menos 2 empresas fuera de las 500 mayores.
export function pickFeatured(pool: InterestingPool, n = 8): Interesting[] {
  const rnd = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
  const picked: Interesting[] = [];
  const perSector = new Map<string, number>();
  const can = (c: Interesting) => !picked.includes(c) && (perSector.get(c.sector ?? "?") ?? 0) < 2;
  const take = (c: Interesting) => {
    picked.push(c);
    perSector.set(c.sector ?? "?", (perSector.get(c.sector ?? "?") ?? 0) + 1);
  };
  const ids = shuffle(SIGNALS.map((s) => s.id));
  let outside = 0;
  for (const id of ids) {
    const all = pool.empresas.filter((c) => c.signals.some((s) => s.id === id) && can(c));
    if (all.length === 0) continue;
    const far = all.filter((c) => c.rank > 500);
    const c = outside < 2 && far.length > 0 ? rnd(far) : rnd(all);
    if (c.rank > 500) outside++;
    take(c);
  }
  // Completa con empresas que activan varias señales (las más "interesantes").
  const multi = shuffle(pool.empresas.filter((c) => c.signals.length >= 2));
  for (const c of [...multi, ...shuffle(pool.empresas)]) {
    if (picked.length >= n) break;
    if (can(c)) take(c);
  }
  return shuffle(picked).slice(0, n);
}
