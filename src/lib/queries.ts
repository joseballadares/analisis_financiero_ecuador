import { db, VEN, type ChartOfAccountsEntryRow } from "@/lib/db";
import { MIN_ACTIVE_REVENUE } from "@/lib/derived";

const VEN_F = VEN.replace(/metrics/g, "f.metrics");

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

export async function getProvinceStats(anio: number): Promise<ProvinceStat[]> {
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

export type SectorYearStat = {
  ciiu_n1: string;
  anio: number;
  empresas: number;
  ingresos: number;
  margen_mediano: number | null;
};

export async function getSectorOverview(anio: number): Promise<SectorYearStat[]> {
  const database = db();
  return database.sql<SectorYearStat>`
    WITH x AS (
      SELECT f.ciiu_n1, f.anio, ${database.sql.raw(VEN_F)} AS ven, (f.metrics->>'utilidad_neta')::float8 AS un
      FROM company_year_financials f
      WHERE f.anio IN (${anio}, ${anio - 1}) AND f.ciiu_n1 IS NOT NULL
    )
    SELECT ciiu_n1, anio,
           (count(*) FILTER (WHERE ven > 0))::int AS empresas,
           COALESCE(sum(ven) FILTER (WHERE ven > 0), 0)::float8 AS ingresos,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY un / ven)
             FILTER (WHERE ven >= ${MIN_ACTIVE_REVENUE}::float8 AND un IS NOT NULL) AS margen_mediano
    FROM x GROUP BY ciiu_n1, anio
  `;
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

export async function getSectorSeries(ciiu: string, desde: number, hasta: number): Promise<SectorSeriesRow[]> {
  const database = db();
  return database.sql<SectorSeriesRow>`
    WITH r AS (
      SELECT f.anio, ${database.sql.raw(VEN_F)} AS ven, (f.metrics->>'utilidad_neta')::float8 AS un
      FROM company_year_financials f
      WHERE f.ciiu_n1 = ${ciiu} AND f.anio BETWEEN ${desde} AND ${hasta}
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

export type SizeMixRow = { cod_segmento: number | null; empresas: number; ingresos: number };

export async function getSectorSizeMix(ciiu: string, anio: number): Promise<SizeMixRow[]> {
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
