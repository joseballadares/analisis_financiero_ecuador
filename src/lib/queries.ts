import { db, VEN, type ChartOfAccountsEntryRow } from "@/lib/db";
import { MIN_ACTIVE_REVENUE } from "@/lib/derived";

const VEN_F = VEN.replace(/metrics/g, "f.metrics");
const VEN_C = VEN.replace(/metrics/g, "c.metrics");

// Caché en memoria para agregaciones pesadas: los datos solo cambian con una nueva carga.
const MEMO_TTL_MS = 6 * 60 * 60 * 1000;
const memoStore = new Map<string, { at: number; value: Promise<unknown> }>();
function memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = memoStore.get(key);
  if (hit && Date.now() - hit.at < MEMO_TTL_MS) return hit.value as Promise<T>;
  const value = fn().catch((e) => {
    memoStore.delete(key);
    throw e;
  });
  memoStore.set(key, { at: Date.now(), value });
  return value;
}

export type AdvancedFilters = {
  anio: number;
  q?: string;
  provincia?: string;
  segmento?: number;
  sector?: string;
  ciiu?: string;
};

export type AdvancedRow = {
  expediente: number;
  ruc: string;
  nombre: string;
  provincia: string | null;
  ciiu_n6: string | null;
  cod_segmento: number | null;
  ingresos: number | null;
  activos: number | null;
  posicion_general: number | null;
};

export async function searchCompaniesAdvanced(
  f: AdvancedFilters,
  limit: number,
  offset: number,
): Promise<{ rows: AdvancedRow[]; total: number }> {
  const database = db();
  const q = f.q?.trim() || null;
  const qLike = q ? "%" + q + "%" : null;
  const qRuc = q ? q + "%" : null;
  const prov = f.provincia || null;
  const seg = f.segmento ?? null;
  const prefix = (f.ciiu?.trim() || f.sector || "").toUpperCase();
  const like = prefix ? prefix + "%" : null;
  const [rows, [count]] = await Promise.all([
    database.sql<AdvancedRow>`
      SELECT c.expediente, c.ruc, c.nombre, c.provincia, f.ciiu_n6, f.cod_segmento,
             (f.metrics->>'ingresos_ventas')::float8 AS ingresos,
             (f.metrics->>'activos')::float8 AS activos,
             f.posicion_general
      FROM company_year_financials f
      JOIN companies c ON c.expediente = f.expediente
      WHERE f.anio = ${f.anio}
        AND (${q}::text IS NULL OR c.nombre ILIKE ${qLike} OR c.ruc LIKE ${qRuc})
        AND (${prov}::text IS NULL OR c.provincia = ${prov})
        AND (${seg}::int IS NULL OR f.cod_segmento = ${seg})
        AND (${like}::text IS NULL OR f.ciiu_n6 LIKE ${like})
      ORDER BY f.posicion_general ASC NULLS LAST, c.nombre
      LIMIT ${limit} OFFSET ${offset}
    `,
    database.sql<{ total: number }>`
      SELECT count(*)::int AS total
      FROM company_year_financials f
      JOIN companies c ON c.expediente = f.expediente
      WHERE f.anio = ${f.anio}
        AND (${q}::text IS NULL OR c.nombre ILIKE ${qLike} OR c.ruc LIKE ${qRuc})
        AND (${prov}::text IS NULL OR c.provincia = ${prov})
        AND (${seg}::int IS NULL OR f.cod_segmento = ${seg})
        AND (${like}::text IS NULL OR f.ciiu_n6 LIKE ${like})
    `,
  ]);
  return { rows, total: count?.total ?? 0 };
}

let provinceCache: string[] | null = null;
export async function getProvinces(): Promise<string[]> {
  if (provinceCache) return provinceCache;
  const database = db();
  const rows = await database.sql<{ provincia: string }>`
    SELECT provincia FROM companies WHERE provincia IS NOT NULL GROUP BY provincia ORDER BY provincia
  `;
  provinceCache = rows.map((r) => r.provincia);
  return provinceCache;
}

export type ProvinceStat = {
  provincia: string | null;
  anio: number;
  empresas: number;
  con_ingresos: number;
  ingresos: number;
  activos: number;
};

async function getProvinceStatsRaw(anio: number): Promise<ProvinceStat[]> {
  const database = db();
  return database.sql<ProvinceStat>`
    WITH x AS (
      SELECT c.provincia, f.anio, ${database.sql.raw(VEN_F)} AS ven, (f.metrics->>'activos')::float8 AS act
      FROM company_year_financials f
      JOIN companies c ON c.expediente = f.expediente
      WHERE f.anio IN (${anio}, ${anio - 1})
    )
    SELECT provincia, anio,
           count(*)::int AS empresas,
           (count(*) FILTER (WHERE ven > 0))::int AS con_ingresos,
           COALESCE(sum(ven) FILTER (WHERE ven > 0), 0)::float8 AS ingresos,
           COALESCE(sum(act) FILTER (WHERE act > 0), 0)::float8 AS activos
    FROM x GROUP BY provincia, anio
  `;
}

export function getProvinceStats(anio: number): Promise<ProvinceStat[]> {
  return memo(`prov:${anio}`, () => getProvinceStatsRaw(anio));
}

export type SectorYearStat = {
  ciiu_n1: string;
  anio: number;
  empresas: number;
  ingresos: number;
  margen_mediano: number | null;
};

// Las variaciones anuales usan una clasificación constante: cada empresa se asigna al sector que
// tiene en el año elegido, también para el año anterior. Así un cambio de CIIU (p. ej. una empresa
// que pasa de manufactura a electricidad) no se confunde con crecimiento o caída del sector.
async function getSectorOverviewRaw(anio: number): Promise<SectorYearStat[]> {
  const database = db();
  return database.sql<SectorYearStat>`
    WITH cur AS (
      SELECT expediente, ciiu_n1 FROM company_year_financials WHERE anio = ${anio} AND ciiu_n1 IS NOT NULL
    ), x AS (
      SELECT COALESCE(cur.ciiu_n1, f.ciiu_n1) AS ciiu_n1, f.anio,
             ${database.sql.raw(VEN_F)} AS ven, (f.metrics->>'utilidad_neta')::float8 AS un
      FROM company_year_financials f
      LEFT JOIN cur ON cur.expediente = f.expediente
      WHERE f.anio IN (${anio}, ${anio - 1})
    )
    SELECT ciiu_n1, anio,
           (count(*) FILTER (WHERE ven > 0))::int AS empresas,
           COALESCE(sum(ven) FILTER (WHERE ven > 0), 0)::float8 AS ingresos,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY un / ven)
             FILTER (WHERE ven >= ${MIN_ACTIVE_REVENUE}::float8 AND un IS NOT NULL) AS margen_mediano
    FROM x WHERE ciiu_n1 IS NOT NULL GROUP BY ciiu_n1, anio
  `;
}

export function getSectorOverview(anio: number): Promise<SectorYearStat[]> {
  return memo(`ov:${anio}`, () => getSectorOverviewRaw(anio));
}

export type SectorSeriesRow = {
  anio: number;
  empresas: number;
  ingresos: number;
  top10: number;
  top5: number;
  ingreso_mediano: number | null;
  margen_mediano: number | null;
};

async function getSectorSeriesRaw(ciiu: string, desde: number, hasta: number): Promise<SectorSeriesRow[]> {
  const database = db();
  return database.sql<SectorSeriesRow>`
    WITH cur AS (
      SELECT expediente, ciiu_n1 FROM company_year_financials WHERE anio = ${hasta} AND ciiu_n1 IS NOT NULL
    ), cand AS (
      SELECT f.expediente, f.anio, f.ciiu_n1, f.metrics
      FROM company_year_financials f
      WHERE f.ciiu_n1 = ${ciiu} AND f.anio BETWEEN ${desde} AND ${hasta}
      UNION ALL
      SELECT f.expediente, f.anio, f.ciiu_n1, f.metrics
      FROM company_year_financials f
      WHERE f.expediente IN (SELECT expediente FROM cur WHERE ciiu_n1 = ${ciiu})
        AND f.anio BETWEEN ${desde} AND ${hasta}
        AND f.ciiu_n1 IS DISTINCT FROM ${ciiu}
    ), r AS (
      SELECT c.anio, ${database.sql.raw(VEN_C)} AS ven, (c.metrics->>'utilidad_neta')::float8 AS un
      FROM cand c
      LEFT JOIN cur ON cur.expediente = c.expediente
      WHERE COALESCE(cur.ciiu_n1, c.ciiu_n1) = ${ciiu}
    ), q AS (
      SELECT anio, ven, un, row_number() OVER (PARTITION BY anio ORDER BY ven DESC) AS rn
      FROM r WHERE ven > 0
    )
    SELECT anio,
           count(*)::int AS empresas,
           sum(ven)::float8 AS ingresos,
           COALESCE(sum(ven) FILTER (WHERE rn <= 10), 0)::float8 AS top10,
           COALESCE(sum(ven) FILTER (WHERE rn <= 5), 0)::float8 AS top5,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY ven) AS ingreso_mediano,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY un / ven)
             FILTER (WHERE ven >= ${MIN_ACTIVE_REVENUE}::float8 AND un IS NOT NULL) AS margen_mediano
    FROM q GROUP BY anio ORDER BY anio
  `;
}

export function getSectorSeries(ciiu: string, desde: number, hasta: number): Promise<SectorSeriesRow[]> {
  return memo(`ser:${ciiu}:${desde}:${hasta}`, () => getSectorSeriesRaw(ciiu, desde, hasta));
}

export type SizeMixRow = { cod_segmento: number | null; empresas: number; ingresos: number };

async function getSectorSizeMixRaw(ciiu: string, anio: number): Promise<SizeMixRow[]> {
  const database = db();
  return database.sql<SizeMixRow>`
    WITH r AS (
      SELECT f.cod_segmento, ${database.sql.raw(VEN_F)} AS ven
      FROM company_year_financials f
      WHERE f.ciiu_n1 = ${ciiu} AND f.anio = ${anio}
    )
    SELECT cod_segmento, count(*)::int AS empresas, sum(ven)::float8 AS ingresos
    FROM r WHERE ven > 0 GROUP BY cod_segmento
  `;
}

export function getSectorSizeMix(ciiu: string, anio: number): Promise<SizeMixRow[]> {
  return memo(`mix:${ciiu}:${anio}`, () => getSectorSizeMixRaw(ciiu, anio));
}

export type SegmentShare = {
  prefix: string;
  empresas: number;
  total: number;
  totalPrev: number;
  rank: number;
  leaders: { expediente: number; ruc: string; nombre: string; ingresos: number }[];
};

export async function getSegmentShare(params: {
  ciiuN6: string;
  anio: number;
  ingresos: number;
}): Promise<SegmentShare | null> {
  const { ciiuN6, anio, ingresos } = params;
  const prefix = ciiuN6.slice(0, 5);
  if (!(ingresos > 0)) return null;
  const database = db();
  const like = prefix + "%";
  const ven = database.sql.raw(VEN);
  const venF = database.sql.raw(VEN_F);
  const [[cur], [prev], leaders] = await Promise.all([
    database.sql<{ empresas: number; total: number; larger: number }>`
      SELECT count(*)::int AS empresas, COALESCE(sum(${ven}), 0)::float8 AS total,
             (count(*) FILTER (WHERE ${ven} > ${ingresos}::float8))::int AS larger
      FROM company_year_financials
      WHERE anio = ${anio} AND ciiu_n6 LIKE ${like} AND ${ven} > 0
    `,
    database.sql<{ total: number }>`
      SELECT COALESCE(sum(${ven}), 0)::float8 AS total
      FROM company_year_financials
      WHERE anio = ${anio - 1} AND ciiu_n6 LIKE ${like} AND ${ven} > 0
    `,
    database.sql<{ expediente: number; ruc: string; nombre: string; ingresos: number }>`
      SELECT c.expediente, c.ruc, c.nombre, (${venF})::float8 AS ingresos
      FROM company_year_financials f
      JOIN companies c ON c.expediente = f.expediente
      WHERE f.anio = ${anio} AND f.ciiu_n6 LIKE ${like} AND ${venF} > 0
      ORDER BY ${venF} DESC
      LIMIT 5
    `,
  ]);
  if (!cur || cur.total <= 0) return null;
  return {
    prefix,
    empresas: cur.empresas,
    total: cur.total,
    totalPrev: prev?.total ?? 0,
    rank: cur.larger + 1,
    leaders,
  };
}

export type CompanyBalanceRow = { anio: number; catalog_id: number; data: Record<string, number> };

export async function getCompanyBalanceRows(expediente: number): Promise<CompanyBalanceRow[]> {
  const database = db();
  return database.sql<CompanyBalanceRow>`
    SELECT anio, catalog_id, data FROM balance_line_items WHERE expediente = ${expediente} ORDER BY anio
  `;
}

export async function getCatalogNames(catalogIds: number[]): Promise<Record<number, Record<string, string>>> {
  const database = db();
  const out: Record<number, Record<string, string>> = {};
  for (const id of catalogIds) {
    const entries = await database.sql<ChartOfAccountsEntryRow>`
      SELECT codigo, nombre FROM chart_of_accounts_entries WHERE catalog_id = ${id}
    `;
    out[id] = Object.fromEntries(entries.map((e) => [e.codigo, e.nombre]));
  }
  return out;
}
