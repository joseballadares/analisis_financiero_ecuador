import { db, VEN } from "@/lib/db";
import { derivedRatios } from "@/lib/derived";
import { persisted } from "@/lib/queries";

const VEN_F = VEN.replace(/metrics/g, "f.metrics");
export const CAPSULE_YEAR = 2008;

export type CapsuleCompany = {
  ruc: string;
  nombre: string;
  rank08: number;
  ing08: number;
  rankNow: number | null;
  ingNow: number | null;
  margenNow: number | null;
  /** Ingresos operacionales por año, de 2008 al último año con datos. */
  series: (number | null)[];
};

export type Capsule = {
  anioNow: number;
  years: number[];
  companies: CapsuleCompany[];
  /** Empresas con ingresos declarados en 2008 y en el último año. */
  n08: number;
  nNow: number;
  /** De las 100 mayores de 2008: cuántas tienen ventas hoy y cuántas siguen en el top 100. */
  top100: { conDatos: number; siguenTop100: number };
  /** Entre las grandes de 2008 con datos en 2009: cuántas vendieron menos que en 2008. */
  post: { comparables: number; vendieronMenos: number };
  /** Cuántos años, de 2008 al último, fue la #1 la misma empresa que lo era en 2008. */
  numeroUno: { nombre: string; anios: number; total: number } | null;
};

const ids = (list: number[]) => list.join(",");

type Db = ReturnType<typeof db>;

// Cada parte se guarda por separado: si una primera visita se corta por tiempo, lo ya calculado queda en caché.
async function loadTop(database: Db, anioNow: number, years: number[]) {
  const raw = database.sql.raw(VEN_F);
  const top = await database.sql<{ expediente: number; ruc: string; nombre: string; ing: number }>`
    SELECT f.expediente, c.ruc, c.nombre, ${raw} AS ing
    FROM company_year_financials f
    JOIN companies c ON c.expediente = f.expediente
    WHERE f.anio = ${CAPSULE_YEAR} AND c.ruc IS NOT NULL AND ${raw} > 0
    ORDER BY ${raw} DESC
    LIMIT 10
  `;
  const topIds = top.map((t) => t.expediente);
  const seriesRows = topIds.length
    ? await database.sql<{ expediente: number; anio: number; ing: number | null; metrics: Record<string, number | null> }>`
        SELECT f.expediente, f.anio, ${raw} AS ing, f.metrics
        FROM company_year_financials f
        WHERE f.expediente IN (${database.sql.raw(ids(topIds))}) AND f.anio BETWEEN ${CAPSULE_YEAR} AND ${anioNow}
      `
    : [];
  return Promise.all(
    top.map(async (t, i): Promise<CapsuleCompany> => {
      const rows = seriesRows.filter((r) => r.expediente === t.expediente);
      const series = years.map((y) => {
        const v = rows.find((r) => r.anio === y)?.ing;
        return typeof v === "number" && v > 0 ? Number(v) : null;
      });
      const now = rows.find((r) => r.anio === anioNow);
      const ingNow = series[series.length - 1];
      let rankNow: number | null = null;
      if (ingNow !== null) {
        const [r] = await database.sql<{ r: number }>`
          SELECT count(*)::int + 1 AS r FROM company_year_financials f
          WHERE f.anio = ${anioNow} AND ${raw} > ${ingNow}
        `;
        rankNow = r?.r ?? null;
      }
      return {
        ruc: t.ruc,
        nombre: t.nombre,
        rank08: i + 1,
        ing08: Number(t.ing),
        rankNow,
        ingNow,
        margenNow: now ? (derivedRatios(now.metrics).rent_neta_ventas ?? null) : null,
        series,
      };
    }),
  );
}

async function loadCounts(database: Db, anioNow: number) {
  const raw = database.sql.raw(VEN_F);
  const counts = await database.sql<{ anio: number; n: number }>`
    SELECT f.anio, count(*)::int AS n FROM company_year_financials f
    WHERE f.anio IN (${CAPSULE_YEAR}, ${anioNow}) AND ${raw} > 0 GROUP BY f.anio
  `;
  return {
    n08: counts.find((c) => c.anio === CAPSULE_YEAR)?.n ?? 0,
    nNow: counts.find((c) => c.anio === anioNow)?.n ?? 0,
  };
}

// Las 100 mayores de 2008 frente al último año.
async function loadTop100(database: Db, anioNow: number) {
  const raw = database.sql.raw(VEN_F);
  const top100 = await database.sql<{ expediente: number }>`
    SELECT f.expediente FROM company_year_financials f
    WHERE f.anio = ${CAPSULE_YEAR} AND ${raw} > 0 ORDER BY ${raw} DESC LIMIT 100
  `;
  const ids100 = top100.map((r) => r.expediente);
  const [cut] = await database.sql<{ ing: number }>`
    SELECT ${raw} AS ing FROM company_year_financials f
    WHERE f.anio = ${anioNow} AND ${raw} > 0 ORDER BY ${raw} DESC OFFSET 99 LIMIT 1
  `;
  const now100 = ids100.length
    ? await database.sql<{ expediente: number; ing: number }>`
        SELECT f.expediente, ${raw} AS ing FROM company_year_financials f
        WHERE f.anio = ${anioNow} AND f.expediente IN (${database.sql.raw(ids(ids100))}) AND ${raw} > 0
      `
    : [];
  return {
    conDatos: now100.length,
    siguenTop100: cut ? now100.filter((r) => Number(r.ing) >= Number(cut.ing)).length : 0,
  };
}

// El primer año después de Lehman: grandes empresas de 2008 (más de US$ 5 millones) frente a 2009.
async function loadPost(database: Db) {
  const raw = database.sql.raw(VEN_F);
  const big08 = await database.sql<{ expediente: number; ing: number }>`
    SELECT f.expediente, ${raw} AS ing FROM company_year_financials f
    WHERE f.anio = ${CAPSULE_YEAR} AND ${raw} > 5000000 ORDER BY ${raw} DESC LIMIT 300
  `;
  const y09 = big08.length
    ? await database.sql<{ expediente: number; ing: number }>`
        SELECT f.expediente, ${raw} AS ing FROM company_year_financials f
        WHERE f.anio = ${CAPSULE_YEAR + 1} AND f.expediente IN (${database.sql.raw(ids(big08.map((r) => r.expediente)))}) AND ${raw} > 0
      `
    : [];
  const m09 = new Map(y09.map((r) => [r.expediente, Number(r.ing)]));
  const comparables = big08.filter((r) => m09.has(r.expediente));
  return {
    comparables: comparables.length,
    vendieronMenos: comparables.filter((r) => (m09.get(r.expediente) as number) < Number(r.ing)).length,
  };
}

// ¿Cuántos años fue la #1 la misma empresa? Una consulta corta por año, en paralelo.
async function loadLeader(database: Db, anioNow: number, years: number[]) {
  const raw = database.sql.raw(VEN_F);
  const leaders = await Promise.all(
    years.map(async (y) => {
      const [r] = await database.sql<{ expediente: number; nombre: string }>`
        SELECT f.expediente, c.nombre FROM company_year_financials f
        JOIN companies c ON c.expediente = f.expediente
        WHERE f.anio = ${y} AND ${raw} > 0 ORDER BY ${raw} DESC LIMIT 1
      `;
      return r ? { anio: y, expediente: r.expediente, nombre: r.nombre } : null;
    }),
  );
  const ok = leaders.filter((l): l is { anio: number; expediente: number; nombre: string } => l !== null);
  const first = ok.find((l) => l.anio === CAPSULE_YEAR);
  return first ? { nombre: first.nombre, anios: ok.filter((l) => l.expediente === first.expediente).length, total: ok.length } : null;
}

// Cápsula del tiempo: las 10 mayores empresas de 2008 (por ingresos operacionales) y cómo les fue hasta hoy.
export async function getCapsule2008(anioNow: number): Promise<Capsule> {
  const database = db();
  const years = Array.from({ length: anioNow - CAPSULE_YEAR + 1 }, (_, i) => CAPSULE_YEAR + i);
  const [companies, counts, top100, post, numeroUno] = await Promise.all([
    persisted(`capsula2008:${anioNow}:top10`, () => loadTop(database, anioNow, years)),
    persisted(`capsula2008:${anioNow}:counts`, () => loadCounts(database, anioNow)),
    persisted(`capsula2008:${anioNow}:top100`, () => loadTop100(database, anioNow)),
    persisted(`capsula2008:${anioNow}:post`, () => loadPost(database)),
    persisted(`capsula2008:${anioNow}:leader`, () => loadLeader(database, anioNow, years)),
  ]);
  return { anioNow, years, companies, n08: counts.n08, nNow: counts.nNow, top100, post, numeroUno };
}
