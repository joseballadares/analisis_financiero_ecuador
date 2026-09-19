import {
  getCompanyByRuc,
  getCompanyFinancials,
  getCompanyBalanceSheet,
  getPeerGroup,
  type Company,
  type CompanyYearFinancial,
} from "@/lib/db";
import { getCatalogNames, getCiiuDescription, getCompanyBalanceRows, getRankingUniverse, getSegmentShare } from "@/lib/queries";
import { fillFromBalance, needsBalanceFill, isInactive } from "@/lib/derived";
import { ratiosByYear } from "@/lib/star";
import { creditScore, riskFlags } from "@/lib/risk";

type Awaited2<T> = T extends Promise<infer U> ? U : T;

// Todo lo que necesitan el perfil web y el informe PDF sobre una empresa y un año, calculado una sola vez.
export type CompanyBundle = Awaited2<ReturnType<typeof buildBundle>>;

export type LoadResult =
  | { kind: "notfound" }
  | { kind: "nodata"; company: Company }
  | { kind: "ok"; bundle: CompanyBundle };

export async function loadCompanyBundle(ruc: string, anioParam?: string): Promise<LoadResult> {
  const company = await getCompanyByRuc(ruc);
  if (!company) return { kind: "notfound" };
  const financials = await getCompanyFinancials(company.expediente);
  if (financials.length === 0) return { kind: "nodata", company };
  return { kind: "ok", bundle: await buildBundle(company, financials, anioParam) };
}

async function buildBundle(company: Company, financials: CompanyYearFinancial[], anioParam?: string) {
  const years = financials.map((f) => f.anio);
  const selectedYear = anioParam ? parseInt(anioParam, 10) : years[0];
  const currentRaw = financials.find((f) => f.anio === selectedYear) ?? financials[0];

  const balanceSheet = await getCompanyBalanceSheet(company.expediente, currentRaw.anio);

  // La fuente trae ceros para algunas empresas del último año aunque el balance sí existe.
  const filled = await Promise.all(
    financials.map(async (f) => {
      if (f.anio < 2019 || !needsBalanceFill(f.metrics)) return f;
      const bs = f.anio === currentRaw.anio ? balanceSheet : await getCompanyBalanceSheet(company.expediente, f.anio);
      return bs ? { ...f, metrics: fillFromBalance(f.metrics, bs.data, bs.catalog_id) } : f;
    }),
  );
  const current = filled.find((f) => f.anio === currentRaw.anio) ?? filled[0];
  const m = current.metrics;
  const inactive = isInactive(m);
  const ownIngresos = (m.ingresos_ventas ?? 0) > 0 ? (m.ingresos_ventas as number) : (m.ingresos_totales ?? 0);
  const prevYear = filled.find((f) => f.anio === current.anio - 1);

  const [balanceRows, segmentShare, universe, ciiuDesc] = await Promise.all([
    getCompanyBalanceRows(company.expediente),
    current.ciiu_n6 && !inactive
      ? getSegmentShare({ ciiuN6: current.ciiu_n6, anio: current.anio, ingresos: ownIngresos })
      : Promise.resolve(null),
    getRankingUniverse(),
    getCiiuDescription(current.ciiu_n6),
  ]);

  const byYearMap = ratiosByYear(filled, balanceRows);
  const byYear = Object.fromEntries(byYearMap);
  const ratioValues: Record<string, number> = {};
  for (const [k, v] of Object.entries(byYear[current.anio]?.values ?? {})) {
    if (typeof v === "number" && Number.isFinite(v)) ratioValues[k] = v;
  }
  const peerGroup = await getPeerGroup({
    expediente: company.expediente,
    anio: current.anio,
    ciiuN6: current.ciiu_n6,
    metrics: m,
    ratioValues,
  });
  const tableYears = filled
    .map((f) => f.anio)
    .filter((y) => y <= current.anio && y > current.anio - 8)
    .sort((a, b) => a - b);

  const niifRows = balanceRows
    .filter((r) => r.catalog_id === 3)
    .map((r) => ({
      anio: r.anio,
      data: Object.fromEntries(Object.entries(r.data).filter(([, v]) => v !== 0 && Number.isFinite(v))) as Record<string, number>,
    }));
  const sriYears = balanceRows.filter((r) => r.catalog_id !== 3).map((r) => r.anio);
  let names: Record<string, string> = {};
  if (niifRows.length > 0) {
    const codes = new Set(niifRows.flatMap((r) => Object.keys(r.data)));
    const all = await getCatalogNames([3]);
    names = Object.fromEntries(Object.entries(all[3] ?? {}).filter(([c]) => codes.has(c)));
  }

  const niifMap = new Map(balanceRows.filter((r) => r.catalog_id === 3).map((r) => [r.anio, r.data]));
  const history = filled.map((f) => ({ anio: f.anio, utilidad: typeof f.metrics.utilidad_neta === "number" ? f.metrics.utilidad_neta : null }));
  const curValues = byYear[current.anio]?.values ?? {};
  const score = creditScore({ values: curValues, m, history: history.filter((h) => h.anio <= current.anio) });
  const flags = inactive
    ? []
    : riskFlags({
        year: current.anio,
        m,
        prevM: prevYear?.metrics,
        values: curValues,
        prevValues: byYear[current.anio - 1]?.values,
        niif: niifMap.get(current.anio),
        prevNiif: niifMap.get(current.anio - 1),
        history,
      });
  const dist = inactive ? {} : (peerGroup?.benchmark.dist ?? {});

  return {
    company,
    years,
    filled,
    current,
    m,
    inactive,
    ownIngresos,
    prevYear,
    balanceSheet,
    balanceRows,
    segmentShare,
    universe,
    ciiuDesc,
    byYear,
    peerGroup,
    tableYears,
    niifRows,
    sriYears,
    names,
    history,
    curValues,
    score,
    flags,
    dist,
  };
}
