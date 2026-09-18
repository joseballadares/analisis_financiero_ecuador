import { getDatabase } from "@netlify/database";
import { derivedRatios } from "@/lib/derived";

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

const PEER_METRICS = [
  "roe",
  "roa",
  "rent_neta_ventas",
  "margen_bruto",
  "liquidez_corriente",
  "end_activo",
] as const;

export type PeerStat = {
  key: string;
  value: number | null;
  median: number | null;
  percentile: number | null;
  n: number;
};

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
  stats: PeerStat[];
};

export async function getPeerGroup(params: {
  expediente: number;
  anio: number;
  ciiuN6: string | null;
  metrics: Metrics;
}): Promise<PeerGroup | null> {
  const { expediente, anio, ciiuN6, metrics } = params;
  const ingresos = metrics.ingresos_totales ?? metrics.ingresos_ventas ?? 0;
  if (!ciiuN6 || !(ingresos > 0)) return null;
  const database = db();

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
             count(*) FILTER (WHERE (metrics->>'ingresos_totales')::float8 > ${ingresos}::float8)::int AS larger
      FROM company_year_financials
      WHERE anio = ${anio} AND ciiu_n6 LIKE ${level.prefix + "%"} AND expediente <> ${expediente}
        AND (metrics->>'ingresos_totales')::float8 > 0
    `;
    chosen = level;
    total = row?.total ?? 0;
    larger = row?.larger ?? 0;
    if (total >= 10) break;
  }
  if (total === 0) return null;

  const like = chosen.prefix + "%";
  const own = derivedRatios(metrics);
  const companyValues: Record<string, number> = {};
  for (const k of PEER_METRICS) {
    const v = own[k];
    if (typeof v === "number") companyValues[k] = v;
  }

  const [peers, stats] = await Promise.all([
    database.sql<PeerRow>`
      SELECT c.expediente, c.ruc, c.nombre, f.metrics
      FROM company_year_financials f
      JOIN companies c ON c.expediente = f.expediente
      WHERE f.anio = ${anio} AND f.ciiu_n6 LIKE ${like} AND f.expediente <> ${expediente}
        AND (f.metrics->>'ingresos_totales')::float8 > 0
      ORDER BY abs(ln((f.metrics->>'ingresos_totales')::float8) - ln(${ingresos}::float8))
      LIMIT 10
    `,
    database.sql<{ key: string; n: number; median: number | null; below: number }>`
      WITH g AS (
        SELECT (metrics->>'utilidad_neta')::float8 AS un,
               (metrics->>'patrimonio')::float8 AS pat,
               (metrics->>'activos')::float8 AS act,
               COALESCE(NULLIF((metrics->>'ingresos_ventas')::float8, 0), (metrics->>'ingresos_totales')::float8) AS ing,
               (metrics->>'margen_bruto')::float8 AS mb,
               (metrics->>'liquidez_corriente')::float8 AS liq
        FROM company_year_financials
        WHERE anio = ${anio} AND ciiu_n6 LIKE ${like} AND expediente <> ${expediente}
          AND (metrics->>'ingresos_totales')::float8 > 0
      ), m AS (
        SELECT k.key, k.v
        FROM g CROSS JOIN LATERAL (VALUES
          ('roe', CASE WHEN g.pat > 0 THEN g.un / g.pat END),
          ('roa', CASE WHEN g.act > 0 THEN g.un / g.act END),
          ('rent_neta_ventas', CASE WHEN g.ing > 0 THEN g.un / g.ing END),
          ('margen_bruto', g.mb),
          ('liquidez_corriente', g.liq),
          ('end_activo', CASE WHEN g.act > 0 THEN (g.act - g.pat) / g.act END)
        ) AS k(key, v)
        WHERE k.v IS NOT NULL
      ), cv AS (SELECT ${JSON.stringify(companyValues)}::jsonb AS c)
      SELECT m.key, count(*)::int AS n,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY m.v) AS median,
             count(*) FILTER (WHERE m.v < (cv.c->>m.key)::float8)::int AS below
      FROM m, cv GROUP BY m.key
    `,
  ]);

  const byKey = new Map(stats.map((s) => [s.key, s]));
  return {
    levelLabel: chosen.label,
    prefix: chosen.prefix,
    total,
    sizeRank: larger + 1,
    peers,
    stats: PEER_METRICS.map((key) => {
      const s = byKey.get(key);
      const value = typeof own[key] === "number" ? (own[key] as number) : null;
      return {
        key,
        value,
        median: s?.median ?? null,
        percentile: s && value !== null && s.n > 0 ? (s.below / s.n) * 100 : null,
        n: s?.n ?? 0,
      };
    }),
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
  "rot_ventas",
  "margen_bruto",
];

// Medianas del sector calculadas desde las empresas (no promedios): el CSV de sectores trae
// promedios arrastrados por casos extremos (liquidez 23,7, rotación de cartera 19.886) y los
// ratios dañados de la fuente (ver src/lib/derived.ts). Los ratios de la fuente que se
// verificaron contra los balances se toman de las filas de cada empresa, excluyendo ceros.
export async function getSectorMedians(ciiuN1: string, anio: number): Promise<Record<string, number | null>> {
  const database = db();
  const keyList = database.sql.raw(SOURCE_SECTOR_KEYS.map((k) => `'${k}'`).join(","));
  const [derived, fromSource] = await Promise.all([
    database.sql<{ key: string; median: number | null }>`
      WITH g AS (
        SELECT (metrics->>'utilidad_neta')::float8 AS un,
               (metrics->>'patrimonio')::float8 AS pat,
               (metrics->>'activos')::float8 AS act,
               COALESCE(NULLIF((metrics->>'ingresos_ventas')::float8, 0), (metrics->>'ingresos_totales')::float8) AS ven,
               (metrics->>'gastos_admin_ventas')::float8 AS gav,
               (metrics->>'gastos_financieros')::float8 AS gfin,
               (metrics->>'rot_cartera')::float8 AS rc,
               (metrics->>'rot_activo_fijo')::float8 AS raf,
               (metrics->>'utilidad_an_imp')::float8 AS uai,
               COALESCE((metrics->>'ingresos_ventas')::float8, 0) - COALESCE((metrics->>'costos_ventas_prod')::float8, 0)
                 - COALESCE((metrics->>'gastos_admin_ventas')::float8, 0) AS uo
        FROM company_year_financials
        WHERE anio = ${anio} AND ciiu_n1 = ${ciiuN1}
      ), m AS (
        SELECT k.key, k.v
        FROM g CROSS JOIN LATERAL (VALUES
          ('roe', CASE WHEN g.pat > 0 THEN g.un / g.pat END),
          ('roa', CASE WHEN g.act > 0 THEN g.un / g.act END),
          ('rent_neta_ventas', CASE WHEN g.ven > 0 THEN g.un / g.ven END),
          ('end_activo', CASE WHEN g.act > 0 THEN (g.act - g.pat) / g.act END),
          ('end_patrimonial', CASE WHEN g.act > 0 AND g.pat > 0 THEN (g.act - g.pat) / g.pat END),
          ('apalancamiento', CASE WHEN g.act > 0 AND g.pat > 0 THEN g.act / g.pat END),
          ('impac_gasto_a_v', CASE WHEN g.ven > 0 THEN g.gav / g.ven END),
          ('impac_carga_finan', CASE WHEN g.ven > 0 THEN g.gfin / g.ven END),
          ('per_med_cobranza', CASE WHEN g.rc > 0 THEN 365 / g.rc END),
          ('margen_operacional', CASE WHEN g.ven > 0 THEN g.uo / g.ven END),
          ('rent_ope_patrimonio', CASE WHEN g.pat > 0 THEN g.uo / g.pat END),
          ('rent_ope_activo', CASE WHEN g.act > 0 THEN g.uo / g.act END),
          ('cobertura_interes', CASE WHEN g.gfin > 0 THEN g.uo / g.gfin END),
          ('rent_neta_activo', CASE WHEN g.act > 0 THEN g.un / g.act END),
          ('end_activo_fijo', CASE WHEN g.pat > 0 AND g.ven > 0 AND g.raf > 0 THEN g.pat * g.raf / g.ven END),
          ('apalancamiento_financiero', CASE WHEN g.uai IS NOT NULL AND g.uai <> 0 AND g.uai + g.gfin > 0 AND g.pat > 0 AND g.act > 0
                                            THEN (g.uai / g.pat) / ((g.uai + g.gfin) / g.act) END)
        ) AS k(key, v)
        WHERE k.v IS NOT NULL AND g.ven > 0
      )
      SELECT key, percentile_cont(0.5) WITHIN GROUP (ORDER BY v) AS median FROM m GROUP BY key
    `,
    database.sql<{ key: string; median: number | null }>`
      SELECT e.key, percentile_cont(0.5) WITHIN GROUP (ORDER BY e.value::float8) AS median
      FROM company_year_financials f, jsonb_each_text(f.metrics) AS e
      WHERE f.anio = ${anio} AND f.ciiu_n1 = ${ciiuN1}
        AND (f.metrics->>'ingresos_totales')::float8 > 0
        AND e.key IN (${keyList})
        AND e.value IS NOT NULL AND e.value::float8 <> 0
      GROUP BY e.key
    `,
  ]);
  const out: Record<string, number | null> = { per_med_pago: null };
  for (const r of fromSource) out[r.key] = r.median;
  for (const r of derived) out[r.key] = r.median;
  return out;
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
