import { getDatabase } from "@netlify/database";

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
    SELECT expediente, ruc, nombre, provincia
    FROM companies
    WHERE nombre ILIKE ${"%" + q + "%"} OR ruc ILIKE ${q + "%"}
    ORDER BY similarity(nombre, ${q}) DESC
    LIMIT ${limit}
  `;
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
