import { getDatabase } from "@netlify/database";
import { MIN_ACTIVE_REVENUE } from "@/lib/derived";

export function db() {
  return getDatabase();
}

export type Metrics = Record<string, number | null>;

export type CompanySearchResult = {
  expediente: number;
  ruc: string;
  nombre: string;
  provincia: string | null;
};

export type Company = {
  expediente: number;
  ruc: string | null;
  nombre: string;
  tipo: string | null;
  provincia_codigo: string | null;
  provincia: string | null;
};

export type CompanyYearFinancial = {
  anio: number;
  posicion_general: number | null;
  cod_segmento: number | null;
  ciiu_n1: string | null;
  ciiu_n6: string | null;
  metrics: Metrics;
};

export type SectorIndicatorRow = {
  anio: number;
  ciiu_n1: string;
  descripcion: string;
  metrics: Metrics;
};

export type SectorCompanyRow = {
  expediente: number;
  ruc: string;
  nombre: string;
  metrics: Metrics;
  posicion_general: number | null;
};

export type RankingCompanyRow = SectorCompanyRow & { ciiu_n6: string | null };

export type ChartOfAccountsEntryRow = { codigo: string; nombre: string };

export type BalanceLineItemRow = {
  anio: number;
  catalog_id: number;
  data: Record<string, number>;
  ciiu: string | null;
};

export async function searchCompanies(query: string, limit = 20): Promise<CompanySearchResult[]> {
  const database = db();
  const q = query.trim();
  if (!q) return [];
  return database.sql<CompanySearchResult>`
    WITH latest AS (SELECT max(anio) AS anio FROM company_year_financials)
    SELECT c.expediente, c.ruc, c.nombre, c.provincia
    FROM companies c
    LEFT JOIN company_year_financials f
      ON f.expediente = c.expediente AND f.anio = (SELECT anio FROM latest)
    WHERE c.nombre ILIKE ${"%" + q + "%"} OR c.ruc ILIKE ${q + "%"}
    ORDER BY (f.posicion_general IS NULL), f.posicion_general, similarity(c.nombre, ${q}) DESC
    LIMIT ${limit}
  `;
}

export type PeerRow = {
  expediente: number;
  ruc: string | null;
  nombre: string;
  metrics: Metrics;
};

export type PeerGroup = {
  levelLabel: string;
  prefix: string;
  total: number;
  sizeRank: number;
  peers: PeerRow[];
  benchmark: Benchmark;
};

export const VEN = "COALESCE(NULLIF((metrics->>'ingresos_ventas')::float8, 0), (metrics->>'ingresos_totales')::float8)";
const BENCHMARK_SIZE = 500;
const MIN_GROUP = 30;

export type RatioDist = {
  n: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
  below: number;
  own: number | null;
};

export type Benchmark = {
  medians: Record<string, number | null>;
  n: number;
  dist: Record<string, RatioDist>;
};

// Distribución de ratios (mediana, cuartiles y percentil de la empresa) de las (hasta 500) empresas
// ACTIVAS del grupo CIIU: las de ingresos más cercanos a la empresa (nearIngresos) o, sin empresa de
// referencia, las 500 de mayores ingresos. Excluir empresas inactivas/diminutas evita que las medianas
// se contaminen (p. ej. margen bruto 100%). Los ratios que dependen del balance NIIF (DIO, DPO, CCC,
// ROIC, deuda neta) se calculan solo con las empresas que tienen balance NIIF ese año.
export async function getBenchmarkMedians(params: {
  prefix: string;
  anio: number;
  nearIngresos?: number | null;
  excludeExpediente?: number;
  companyValues?: Record<string, number>;
}): Promise<Benchmark> {
  const database = db();
  const { prefix, anio } = params;
  const near = typeof params.nearIngresos === "number" && params.nearIngresos > 0;
  const target = near ? (params.nearIngresos as number) : 1;
  const exclude = params.excludeExpediente ?? -1;
  const own = JSON.stringify(params.companyValues ?? {});
  const ven = database.sql.raw(VEN);
  const keyList = database.sql.raw(SOURCE_SECTOR_KEYS.map((k) => `'${k}'`).join(","));
  const rows = await database.sql<{
    key: string;
    n: number;
    median: number | null;
    p25: number | null;
    p75: number | null;
    below: number;
    own: number | null;
  }>`
    WITH base AS (
      SELECT expediente, metrics FROM company_year_financials
      WHERE anio = ${anio} AND ciiu_n6 LIKE ${prefix + "%"} AND expediente <> ${exclude}
        AND ${ven} >= ${MIN_ACTIVE_REVENUE}::float8 AND (metrics->>'activos')::float8 > 0
      ORDER BY CASE WHEN ${near}::boolean THEN abs(ln(${ven}) - ln(${target}::float8)) ELSE -${ven} END
      LIMIT ${BENCHMARK_SIZE}
    ), g AS (
      SELECT (base.metrics->>'utilidad_neta')::float8 AS un,
             (base.metrics->>'patrimonio')::float8 AS pat,
             (base.metrics->>'activos')::float8 AS act,
             ${ven} AS ven,
             (base.metrics->>'gastos_admin_ventas')::float8 AS gav,
             (base.metrics->>'gastos_financieros')::float8 AS gfin,
             (base.metrics->>'rot_cartera')::float8 AS rc,
             (base.metrics->>'rot_activo_fijo')::float8 AS raf,
             (base.metrics->>'utilidad_an_imp')::float8 AS uai,
             (base.metrics->>'costos_ventas_prod')::float8 AS cvp,
             COALESCE((base.metrics->>'depreciaciones')::float8, 0) + COALESCE((base.metrics->>'amortizaciones')::float8, 0) AS da,
             COALESCE((base.metrics->>'ingresos_ventas')::float8, 0) - COALESCE((base.metrics->>'costos_ventas_prod')::float8, 0)
               - COALESCE((base.metrics->>'gastos_admin_ventas')::float8, 0) AS uo,
             (b.expediente IS NOT NULL) AS hasb,
             (b.data->>'10103')::float8 AS inv,
             (b.data->>'20103')::float8 AS cxp,
             (b.data->>'10101')::float8 AS cash,
             (b.data->>'201')::float8 AS pc,
             COALESCE((b.data->>'20102')::float8, 0) + COALESCE((b.data->>'20104')::float8, 0)
               + COALESCE((b.data->>'20106')::float8, 0) + COALESCE((b.data->>'20109')::float8, 0)
               + COALESCE((b.data->>'20201')::float8, 0) + COALESCE((b.data->>'20203')::float8, 0)
               + COALESCE((b.data->>'20205')::float8, 0) AS debt
      FROM base
      LEFT JOIN balance_line_items b
        ON b.expediente = base.expediente AND b.anio = ${anio} AND b.catalog_id = 3
    ), m AS (
      SELECT k.key, k.v
      FROM g CROSS JOIN LATERAL (VALUES
        ('roe', CASE WHEN g.pat > 0 THEN g.un / g.pat END),
        ('roa', CASE WHEN g.act > 0 THEN g.un / g.act END),
        ('rent_neta_ventas', CASE WHEN g.ven > 0 THEN g.un / g.ven END),
        ('end_activo', CASE WHEN g.act > 0 THEN (g.act - g.pat) / g.act END),
        ('margen_bruto', CASE WHEN g.cvp > 0 THEN (g.ven - g.cvp) / g.ven END),
        ('rot_ventas', CASE WHEN g.act > 0 THEN g.ven / g.act END),
        ('end_patrimonial', CASE WHEN g.act > 0 AND g.pat > 0 THEN (g.act - g.pat) / g.pat END),
        ('apalancamiento', CASE WHEN g.act > 0 AND g.pat > 0 THEN g.act / g.pat END),
        ('impac_gasto_a_v', CASE WHEN g.ven > 0 THEN g.gav / g.ven END),
        ('impac_carga_finan', CASE WHEN g.ven > 0 THEN g.gfin / g.ven END),
        ('per_med_cobranza', CASE WHEN g.rc > 0 THEN 365 / g.rc END),
        ('margen_operacional', CASE WHEN g.ven > 0 THEN g.uo / g.ven END),
        ('rent_ope_patrimonio', CASE WHEN g.pat > 0 THEN g.uo / g.pat END),
        ('rent_ope_activo', CASE WHEN g.act > 0 THEN g.uo / g.act END),
        ('rent_neta_activo', CASE WHEN g.act > 0 THEN g.un / g.act END),
        ('cobertura_interes', CASE WHEN g.gfin > 0 THEN g.uo / g.gfin END),
        ('end_activo_fijo', CASE WHEN g.pat > 0 AND g.ven > 0 AND g.raf > 0 THEN g.pat * g.raf / g.ven END),
        ('apalancamiento_financiero', CASE WHEN g.uai IS NOT NULL AND g.uai <> 0 AND g.uai + g.gfin > 0 AND g.pat > 0 AND g.act > 0
                                          THEN (g.uai / g.pat) / ((g.uai + g.gfin) / g.act) END),
        ('margen_ebitda', CASE WHEN g.ven > 0 THEN (g.uo + g.da) / g.ven END),
        ('cobertura_ebitda', CASE WHEN g.gfin > 0 THEN (g.uo + g.da) / g.gfin END),
        ('dio', CASE WHEN g.hasb AND g.cvp > 0 AND g.inv IS NOT NULL THEN g.inv / g.cvp * 365 END),
        ('per_med_pago', CASE WHEN g.hasb AND g.cvp > 0 AND g.cxp > 0 THEN g.cxp / g.cvp * 365 END),
        ('ccc', CASE WHEN g.hasb AND g.cvp > 0 AND g.rc > 0 AND g.inv IS NOT NULL AND g.cxp > 0
                     THEN 365 / g.rc + g.inv / g.cvp * 365 - g.cxp / g.cvp * 365 END),
        ('roic', CASE WHEN g.hasb AND g.ven > 0 AND (g.debt + g.pat - COALESCE(g.cash, 0)) > 0
                      THEN g.uo * 0.75 / (g.debt + g.pat - COALESCE(g.cash, 0)) END),
        ('deuda_neta_ebitda', CASE WHEN g.hasb AND (g.uo + g.da) > 0 THEN (g.debt - COALESCE(g.cash, 0)) / (g.uo + g.da) END),
        ('razon_inmediata', CASE WHEN g.hasb AND g.pc > 0 AND g.cash IS NOT NULL THEN g.cash / g.pc END),
        ('independencia_financiera', CASE WHEN g.act > 0 THEN g.pat / g.act END),
        ('concentracion_deuda_cp', CASE WHEN g.hasb AND g.pc > 0 AND g.act - g.pat > 0 THEN g.pc / (g.act - g.pat) END),
        ('deuda_patrimonio', CASE WHEN g.hasb AND g.pat > 0 THEN g.debt / g.pat END),
        ('rot_inventarios', CASE WHEN g.hasb AND g.cvp > 0 AND g.inv > 0 THEN g.cvp / g.inv END),
        ('roce', CASE WHEN g.hasb AND g.ven > 0 AND g.pc IS NOT NULL AND g.act - g.pc > 0 THEN g.uo / (g.act - g.pc) END)
      ) AS k(key, v)
      WHERE k.v IS NOT NULL
    ), s AS (
      SELECT e.key, e.value::float8 AS v
      FROM base b, jsonb_each_text(b.metrics) AS e
      WHERE e.key IN (${keyList}) AND e.value IS NOT NULL AND e.value::float8 <> 0
    ), cv AS (SELECT ${own}::jsonb AS c)
    SELECT x.key, count(*)::int AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY x.v) AS median,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY x.v) AS p25,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY x.v) AS p75,
           (count(*) FILTER (WHERE x.v < (cv.c->>x.key)::float8))::int AS below,
           max((cv.c->>x.key)::float8) AS own
    FROM (SELECT key, v FROM m UNION ALL SELECT key, v FROM s UNION ALL SELECT '__n', count(*)::float8 FROM base) x
    CROSS JOIN cv
    GROUP BY x.key
  `;
  const medians: Record<string, number | null> = {};
  const dist: Record<string, RatioDist> = {};
  let n = 0;
  for (const r of rows) {
    if (r.key === "__n") {
      n = r.median ?? 0;
      continue;
    }
    medians[r.key] = r.median;
    dist[r.key] = { n: r.n, median: r.median, p25: r.p25, p75: r.p75, below: r.below, own: r.own };
  }
  return { medians, n, dist };
}

export async function getPeerGroup(params: {
  expediente: number;
  anio: number;
  ciiuN6: string | null;
  metrics: Metrics;
  ratioValues?: Record<string, number>;
}): Promise<PeerGroup | null> {
  const { expediente, anio, ciiuN6, metrics } = params;
  const ingresos = (metrics.ingresos_ventas ?? 0) > 0 ? (metrics.ingresos_ventas as number) : (metrics.ingresos_totales ?? 0);
  if (!ciiuN6 || !(ingresos >= MIN_ACTIVE_REVENUE)) return null;
  const database = db();
  const ven = database.sql.raw(VEN);
  const venF = database.sql.raw(VEN.replace(/metrics/g, "f.metrics"));

  const levels = [
    { label: "misma actividad", prefix: ciiuN6 },
    { label: "misma clase de actividad", prefix: ciiuN6.slice(0, 5) },
    { label: "mismo grupo de actividad", prefix: ciiuN6.slice(0, 4) },
    { label: "mismo sector", prefix: ciiuN6.slice(0, 1) },
  ].filter((l, i, arr) => arr.findIndex((x) => x.prefix === l.prefix) === i);

  let chosen = levels[levels.length - 1];
  let total = 0;
  let larger = 0;
  for (const level of levels) {
    const [row] = await database.sql<{ total: number; larger: number }>`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE ${ven} > ${ingresos}::float8)::int AS larger
      FROM company_year_financials
      WHERE anio = ${anio} AND ciiu_n6 LIKE ${level.prefix + "%"} AND expediente <> ${expediente}
        AND ${ven} >= ${MIN_ACTIVE_REVENUE}::float8 AND (metrics->>'activos')::float8 > 0
    `;
    chosen = level;
    total = row?.total ?? 0;
    larger = row?.larger ?? 0;
    if (total >= MIN_GROUP) break;
  }
  if (total === 0) return null;

  const like = chosen.prefix + "%";
  const [peers, benchmark] = await Promise.all([
    database.sql<PeerRow>`
      SELECT c.expediente, c.ruc, c.nombre, f.metrics
      FROM company_year_financials f
      JOIN companies c ON c.expediente = f.expediente
      WHERE f.anio = ${anio} AND f.ciiu_n6 LIKE ${like} AND f.expediente <> ${expediente}
        AND ${venF} >= ${MIN_ACTIVE_REVENUE}::float8 AND (f.metrics->>'activos')::float8 > 0
      ORDER BY abs(ln(${venF}) - ln(${ingresos}::float8))
      LIMIT 10
    `,
    getBenchmarkMedians({
      prefix: chosen.prefix,
      anio,
      nearIngresos: ingresos,
      excludeExpediente: expediente,
      companyValues: params.ratioValues,
    }),
  ]);

  return {
    levelLabel: chosen.label,
    prefix: chosen.prefix,
    total,
    sizeRank: larger + 1,
    peers,
    benchmark,
  };
}

export async function getCompanyByRuc(ruc: string): Promise<Company | null> {
  const database = db();
  const [company] = await database.sql<Company>`
    SELECT * FROM companies WHERE ruc = ${ruc} ORDER BY expediente DESC LIMIT 1
  `;
  return company ?? null;
}

export async function getCompanyFinancials(expediente: number): Promise<CompanyYearFinancial[]> {
  const database = db();
  return database.sql<CompanyYearFinancial>`
    SELECT anio, posicion_general, cod_segmento, ciiu_n1, ciiu_n6, metrics
    FROM company_year_financials
    WHERE expediente = ${expediente}
    ORDER BY anio DESC
  `;
}

export async function getCompanyBalanceSheet(expediente: number, anio: number) {
  const database = db();
  const [row] = await database.sql<BalanceLineItemRow>`
    SELECT bli.anio, bli.catalog_id, bli.data, bli.ciiu
    FROM balance_line_items bli
    WHERE bli.expediente = ${expediente} AND bli.anio = ${anio}
  `;
  if (!row) return null;
  const entries = await database.sql<ChartOfAccountsEntryRow>`
    SELECT codigo, nombre FROM chart_of_accounts_entries WHERE catalog_id = ${row.catalog_id}
  `;
  const names = Object.fromEntries(entries.map((e) => [e.codigo, e.nombre]));
  return { ...row, names };
}

export async function getSectorIndicators(
  ciiuN1: string,
  anio: number
): Promise<SectorIndicatorRow | null> {
  const database = db();
  const [row] = await database.sql<SectorIndicatorRow>`
    SELECT * FROM sector_indicators WHERE ciiu_n1 = ${ciiuN1} AND anio = ${anio}
  `;
  return row ?? null;
}

// Medianas del sector recalculadas con los mismos ratios derivados que se muestran por empresa
// (ver src/lib/derived.ts); las del CSV de sectores heredan los errores de la fuente.
const SOURCE_SECTOR_KEYS = [
  "liquidez_corriente",
  "prueba_acida",
  "end_activo_fijo",
  "end_corto_plazo",
  "end_largo_plazo",
  "fortaleza_patrimonial",
  "end_patrimonial_ct",
  "end_patrimonial_nct",
  "apalancamiento_c_l_plazo",
  "rot_cartera",
  "rot_activo_fijo",
];

export async function getSectorMedians(ciiu: string, anio: number): Promise<Benchmark> {
  return getBenchmarkMedians({ prefix: ciiu, anio });
}

export async function getCompaniesBySector(
  ciiuN1: string,
  anio: number,
  limit = 50
): Promise<SectorCompanyRow[]> {
  const database = db();
  return database.sql<SectorCompanyRow>`
    SELECT c.expediente, c.ruc, c.nombre, cyf.metrics, cyf.posicion_general
    FROM company_year_financials cyf
    JOIN companies c ON c.expediente = cyf.expediente
    WHERE cyf.ciiu_n1 = ${ciiuN1} AND cyf.anio = ${anio}
    ORDER BY cyf.posicion_general ASC NULLS LAST
    LIMIT ${limit}
  `;
}

export async function getTopLevelSectors() {
  const database = db();
  return database.sql<{ codigo: string; descripcion: string }>`
    SELECT codigo, descripcion FROM ciiu WHERE length(codigo) = 1 ORDER BY codigo
  `;
}

export async function getLatestSectorYear(): Promise<number> {
  const database = db();
  const [row] = await database.sql<{ anio: number }>`
    SELECT max(anio) as anio FROM sector_indicators
  `;
  return row?.anio ?? new Date().getFullYear() - 1;
}

export async function getTopCompaniesOverall(
  anio: number,
  limit = 100
): Promise<RankingCompanyRow[]> {
  const database = db();
  return database.sql<RankingCompanyRow>`
    SELECT c.expediente, c.ruc, c.nombre, cyf.metrics, cyf.posicion_general, cyf.ciiu_n6
    FROM company_year_financials cyf
    JOIN companies c ON c.expediente = cyf.expediente
    WHERE cyf.anio = ${anio} AND cyf.posicion_general IS NOT NULL
    ORDER BY cyf.posicion_general ASC
    LIMIT ${limit}
  `;
}

export async function getLatestRankingYear(): Promise<number> {
  const database = db();
  const [row] = await database.sql<{ anio: number }>`
    SELECT max(anio) as anio FROM company_year_financials
  `;
  return row?.anio ?? new Date().getFullYear() - 1;
}
