import { db, VEN } from "@/lib/db";
import { persisted } from "@/lib/queries";
import { aniosDesde } from "@/lib/catastro";

const VEN_F = VEN.replace(/metrics/g, "f.metrics");

// "Antigua": empresa activa en el último año con 75 años o más desde su inicio de actividades registrado en el SRI.
export const OLD_YEARS = 75;

export type OldRow = {
  ruc: string;
  nombre: string;
  provincia: string | null;
  fecha_inicio: string;
  estado: string | null;
  ciiu_n1: string | null;
  cod_segmento: number | null;
  ventas: number | null; // ingresos operacionales del último año (null si no tuvo)
  utilidad: number | null;
  activos: number | null;
  empleados: number | null;
};
export type Group = { key: string; n: number; n50: number; medianAge: number };
export type Decade = { decade: number; total: number; activoSri: number; conVentas: number };
export type AntiquityReport = {
  anioNow: number;
  fechaCorte: string;
  poblacion: number; // RUC con fecha de inicio válida
  activas: number; // con ventas en el último año
  thresholds: { years: number; n: number }[]; // activas con al menos esos años
  medianAge: number;
  oldestOverall: OldRow[]; // las más antiguas de todo el catastro (activas o no)
  oldestActive: OldRow[]; // las más antiguas con ventas en el último año
  decades: Decade[];
  sectors: Group[];
  provinces: Group[];
  sizes: Group[];
  bands: Group[]; // por tamaño de ventas
  top100Sales: { n50: number; medianAge: number; others: { n50: number; n: number; medianAge: number } };
  quantiles: number[]; // 201 fechas (en días desde 1970) de los percentiles 0..100 en pasos de 0,5
  count75Active: number;
};

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const dayNum = (iso: string) => Math.floor(Date.parse(iso + "T00:00:00Z") / 86400000);

async function compute(anioNow: number, hoy: Date): Promise<AntiquityReport> {
  const database = db();
  const raw = database.sql.raw(VEN_F);
  const act = await database.sql<{
    ruc: string; nombre: string; provincia: string | null; fecha_inicio: string; estado: string | null; ciiu_n1: string | null;
    cod_segmento: number | null; ing: number; utilidad: number | null; activos: number | null; empleados: number | null;
  }>`
    SELECT DISTINCT ON (r.ruc) r.ruc, c.nombre, c.provincia, to_char(r.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, r.estado,
           f.ciiu_n1, f.cod_segmento, ${raw} AS ing,
           (f.metrics->>'utilidad_neta')::float8 AS utilidad, (f.metrics->>'activos')::float8 AS activos, (f.metrics->>'n_empleados')::float8 AS empleados
    FROM ruc_catastro r
    JOIN companies c ON c.ruc = r.ruc
    JOIN company_year_financials f ON f.expediente = c.expediente AND f.anio = ${anioNow}
    WHERE r.fecha_inicio IS NOT NULL AND ${raw} > 0
    ORDER BY r.ruc, ${raw} DESC
  `;
  const rows: OldRow[] = act.map((a) => ({
    ruc: a.ruc, nombre: a.nombre, provincia: a.provincia, fecha_inicio: a.fecha_inicio, estado: a.estado, ciiu_n1: a.ciiu_n1,
    cod_segmento: a.cod_segmento, ventas: Number(a.ing), utilidad: a.utilidad === null ? null : Number(a.utilidad),
    activos: a.activos === null ? null : Number(a.activos), empleados: a.empleados === null ? null : Number(a.empleados),
  }));
  rows.sort((x, y) => (x.fecha_inicio < y.fecha_inicio ? -1 : x.fecha_inicio > y.fecha_inicio ? 1 : 0));

  const [pop] = await database.sql<{ n: number }>`SELECT count(*)::int AS n FROM ruc_catastro WHERE fecha_inicio IS NOT NULL`;
  const decRows = await database.sql<{ dec: number; total: number; activo_sri: number }>`
    SELECT (extract(year FROM fecha_inicio)::int / 10 * 10) AS dec, count(*)::int AS total, (count(*) FILTER (WHERE estado = 'ACTIVO'))::int AS activo_sri
    FROM ruc_catastro WHERE fecha_inicio IS NOT NULL GROUP BY 1 ORDER BY 1
  `;
  const salesByDecade = new Map<number, number>();
  for (const r of rows) {
    const d = Math.floor(Number(r.fecha_inicio.slice(0, 4)) / 10) * 10;
    salesByDecade.set(d, (salesByDecade.get(d) ?? 0) + 1);
  }
  const decades: Decade[] = decRows.map((d) => ({ decade: d.dec, total: d.total, activoSri: d.activo_sri, conVentas: salesByDecade.get(d.dec) ?? 0 }));

  // Las más antiguas de todo el catastro, con sus cifras del último año cuando las tienen.
  const oldAll = await database.sql<{
    ruc: string; nombre: string; provincia: string | null; fecha_inicio: string; estado: string | null; ciiu_n1: string | null;
    cod_segmento: number | null; ing: number | null; utilidad: number | null; activos: number | null; empleados: number | null;
  }>`
    SELECT r.ruc, c.nombre, c.provincia, to_char(r.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, r.estado,
           f.ciiu_n1, f.cod_segmento, ${raw} AS ing,
           (f.metrics->>'utilidad_neta')::float8 AS utilidad, (f.metrics->>'activos')::float8 AS activos, (f.metrics->>'n_empleados')::float8 AS empleados
    FROM (SELECT DISTINCT ON (ruc) * FROM ruc_catastro WHERE fecha_inicio IS NOT NULL ORDER BY ruc, fecha_inicio) r
    JOIN LATERAL (SELECT * FROM companies c0 WHERE c0.ruc = r.ruc ORDER BY c0.expediente LIMIT 1) c ON true
    LEFT JOIN company_year_financials f ON f.expediente = c.expediente AND f.anio = ${anioNow}
    ORDER BY r.fecha_inicio, r.ruc
    LIMIT 45
  `;
  const oldestOverall: OldRow[] = oldAll.map((a) => ({
    ruc: a.ruc, nombre: a.nombre, provincia: a.provincia, fecha_inicio: a.fecha_inicio, estado: a.estado, ciiu_n1: a.ciiu_n1,
    cod_segmento: a.cod_segmento, ventas: a.ing !== null && Number(a.ing) > 0 ? Number(a.ing) : null,
    utilidad: a.utilidad === null ? null : Number(a.utilidad), activos: a.activos === null ? null : Number(a.activos),
    empleados: a.empleados === null ? null : Number(a.empleados),
  }));

  const ages = rows.map((r) => aniosDesde(r.fecha_inicio, hoy));
  const thresholds = [100, 75, 50, 25, 10].map((y) => ({ years: y, n: ages.filter((a) => a >= y).length }));
  const group = (keyOf: (r: OldRow) => string | null): Group[] => {
    const m = new Map<string, number[]>();
    rows.forEach((r, i) => {
      const k = keyOf(r);
      if (!k) return;
      (m.get(k) ?? m.set(k, []).get(k)!).push(ages[i]);
    });
    return [...m.entries()].map(([key, v]) => ({ key, n: v.length, n50: v.filter((a) => a >= 50).length, medianAge: median(v) }));
  };
  const band = (v: number) =>
    v >= 100e6 ? "Más de US$ 100 M" : v >= 10e6 ? "US$ 10 M – 100 M" : v >= 1e6 ? "US$ 1 M – 10 M" : v >= 1e5 ? "US$ 100 mil – 1 M" : "Menos de US$ 100 mil";
  const bands = group((r) => (r.ventas ? band(r.ventas) : null));

  // Las 100 mayores por ventas frente al resto.
  const bySales = rows.map((r, i) => ({ v: r.ventas ?? 0, a: ages[i] })).sort((x, y) => y.v - x.v);
  const top = bySales.slice(0, 100).map((x) => x.a);
  const rest = bySales.slice(100).map((x) => x.a);

  const sortedDays = rows.map((r) => dayNum(r.fecha_inicio)).sort((a, b) => a - b);
  const quantiles = Array.from({ length: 201 }, (_, i) => sortedDays[Math.min(sortedDays.length - 1, Math.floor((i / 200) * (sortedDays.length - 1)))] ?? 0);

  return {
    anioNow,
    fechaCorte: hoy.toISOString().slice(0, 10),
    poblacion: pop?.n ?? 0,
    activas: rows.length,
    thresholds,
    medianAge: median(ages),
    oldestOverall,
    oldestActive: rows.slice(0, 60),
    decades,
    sectors: group((r) => r.ciiu_n1),
    provinces: group((r) => (r.provincia ? r.provincia.trim() : null)),
    sizes: group((r) => (r.cod_segmento ? String(r.cod_segmento) : null)),
    bands,
    top100Sales: { n50: top.filter((a) => a >= 50).length, medianAge: median(top), others: { n: rest.length, n50: rest.filter((a) => a >= 50).length, medianAge: median(rest) } },
    quantiles,
    count75Active: ages.filter((a) => a >= OLD_YEARS).length,
  };
}

// El informe depende de la fecha (las edades cambian); se guarda por mes.
export function getAntiquityReport(anioNow: number): Promise<AntiquityReport> {
  const hoy = new Date();
  return persisted(`antiguas:${anioNow}:${hoy.toISOString().slice(0, 7)}`, () => compute(anioNow, hoy));
}

// Porcentaje de empresas activas cuyo inicio de actividades es posterior a la fecha dada (es decir, a las que esta empresa supera en antigüedad).
export function shareYoungerThan(quantiles: number[], iso: string): number {
  const d = dayNum(iso);
  let older = 0;
  for (const q of quantiles) if (q < d) older++;
  return 1 - older / quantiles.length;
}

// Empresa "antigua y vigente": activa en el último año y con 75 años o más.
export function isOldActive(report: AntiquityReport | null, ruc: string): { rank: number } | null {
  if (!report) return null;
  const i = report.oldestActive.findIndex((r) => r.ruc === ruc);
  if (i < 0) return null;
  return aniosDesde(report.oldestActive[i].fecha_inicio) >= OLD_YEARS ? { rank: i + 1 } : null;
}
