import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyByRuc,
  getCompanyFinancials,
  getCompanyBalanceSheet,
  getPeerGroup,
  type CompanyYearFinancial,
} from "@/lib/db";
import { getCatalogNames, getCiiuDescription, getCompanyBalanceRows, getRankingUniverse, getSegmentShare } from "@/lib/queries";
import { formatMoney, formatPercent, segmentName, sentenceCase, titleCase } from "@/lib/format";
import RatiosTable from "@/components/RatiosTable";
import RatiosCards from "@/components/RatiosCards";
import ViewToggle from "@/components/ViewToggle";
import StarRatios from "@/components/StarRatios";
import BalanceSheetView from "@/components/BalanceSheetView";
import PeersTab from "@/components/PeersTab";
import StatementsView from "@/components/StatementsView";
import SegmentCard from "@/components/SegmentCard";
import ResumenTab from "@/components/ResumenTab";
import { fillFromBalance, needsBalanceFill, isInactive, derivedRatios, STRUCTURE_KEYS } from "@/lib/derived";
import { ratiosByYear } from "@/lib/star";
import { creditScore, riskFlags } from "@/lib/risk";
import RiskTab from "@/components/RiskTab";
import Tabs from "@/components/Tabs";
import SearchBox from "@/components/SearchBox";
import YearSelect from "@/components/YearSelect";

export const dynamic = "force-dynamic";

export default async function EmpresaPage({
  params,
  searchParams,
}: {
  params: Promise<{ ruc: string }>;
  searchParams: Promise<{ anio?: string }>;
}) {
  const { ruc } = await params;
  const { anio: anioParam } = await searchParams;

  const company = await getCompanyByRuc(ruc);
  if (!company) notFound();

  const financials = await getCompanyFinancials(company.expediente);
  if (financials.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <h1 className="text-2xl font-semibold">{company.nombre}</h1>
        <p className="mt-2 text-muted">RUC {company.ruc}</p>
        <p className="mt-6 text-sm text-muted">
          No hay información financiera registrada para esta empresa.
        </p>
      </div>
    );
  }

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
      data: Object.fromEntries(Object.entries(r.data).filter(([, v]) => v !== 0 && Number.isFinite(v))),
    }));
  const sriYears = balanceRows.filter((r) => r.catalog_id !== 3).map((r) => r.anio);
  const niifNames =
    niifRows.length > 0
      ? (() => {
          const codes = new Set(niifRows.flatMap((r) => Object.keys(r.data)));
          return getCatalogNames([3]).then((all) =>
            Object.fromEntries(Object.entries(all[3] ?? {}).filter(([c]) => codes.has(c))),
          );
        })()
      : Promise.resolve({} as Record<string, string>);
  const names = await niifNames;

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
  const alertCount = flags.filter((f) => f.severity !== "info").length;
  const rankNow = current.posicion_general;
  const facts = [
    { label: "RUC", value: company.ruc },
    { label: "Tipo de compañía", value: company.tipo?.trim() || "—" },
    { label: "Provincia", value: titleCase(company.provincia?.trim()) },
    {
      label: "Actividad principal",
      value: current.ciiu_n6 ? (
        <>
          <span className="font-mono text-xs">{current.ciiu_n6}</span>
          {ciiuDesc ? ` · ${sentenceCase(ciiuDesc)}` : ""}
        </>
      ) : (
        "—"
      ),
    },
    { label: "Tamaño (Superintendencia)", value: segmentName(current.cod_segmento) },
    { label: "Mercado de Valores", value: filled.some((f) => f.metrics.cia_imvalores === 1) ? "Sí, participa" : "No" },
    { label: `Empleados ${current.anio}`, value: m.n_empleados ? Number(m.n_empleados).toLocaleString("es-EC") : "—" },
    {
      label: `Ranking nacional ${current.anio}`,
      value: rankNow ? `#${rankNow.toLocaleString("es-EC")} de ${(universe[current.anio] ?? 0).toLocaleString("es-EC")}` : "—",
    },
  ];
  const dist = inactive ? {} : (peerGroup?.benchmark.dist ?? {});
  const structureOnly = inactive && (m.activos ?? 0) >= 10000;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="mb-8 max-w-xl">
        <SearchBox compact />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{company.nombre}</h1>
          <p className="mt-1 text-sm text-muted">
            RUC {company.ruc} · {company.tipo?.trim()} · {titleCase(company.provincia?.trim())}
            {current.ciiu_n6 && (
              <>
                {" "}
                ·{" "}
                <Link href={`/sector/${current.ciiu_n1}`} className="text-brand hover:underline">
                  {current.ciiu_n6}
                </Link>
              </>
            )}
          </p>
        </div>
        <YearSelect ruc={ruc} years={years} current={current.anio} />
      </div>

      {inactive && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm">
          <strong>Sin actividad operativa reportada en {current.anio}.</strong>{" "}
          <span className="text-muted">
            Los ingresos son menores a $1.000, lo que sugiere una empresa pre-operativa, en hibernación o de
            propósito limitado. No se calculan comparables ni ratios de rentabilidad o gestión porque no
            tendrían significado.
          </span>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Ingresos" value={formatMoney(m.ingresos_ventas as number)} delta={change(m.ingresos_ventas, prevYear?.metrics.ingresos_ventas)} />
        <Stat label="Activos" value={formatMoney(m.activos as number)} delta={change(m.activos, prevYear?.metrics.activos)} />
        <Stat label="Patrimonio" value={formatMoney(m.patrimonio as number)} delta={change(m.patrimonio, prevYear?.metrics.patrimonio)} />
        <Stat label="Utilidad neta" value={formatMoney(m.utilidad_neta as number)} delta={change(m.utilidad_neta, prevYear?.metrics.utilidad_neta)} />
      </div>

      <div className="mt-10">
        <Tabs
          tabs={[
            {
              id: "resumen",
              label: "Resumen",
              content: (
                <ResumenTab
                  financials={filled}
                  byYear={byYear}
                  currentYear={current.anio}
                  universe={universe}
                  facts={facts}
                  dist={dist}
                  groupLabel={peerGroup ? `${peerGroup.levelLabel} (CIIU ${peerGroup.prefix})` : null}
                  benchN={peerGroup?.benchmark.n ?? 0}
                  segment={
                    segmentShare && ownIngresos > 0 ? (
                      <SegmentCard
                        share={segmentShare}
                        own={ownIngresos}
                        ownPrev={prevYear ? (prevYear.metrics.ingresos_ventas ?? null) : null}
                        ruc={company.ruc}
                      />
                    ) : null
                  }
                />
              ),
            },
            {
              id: "ratios",
              label: "Ratios financieros",
              content:
                inactive && !structureOnly ? (
                  <p className="text-sm text-muted">
                    No hay ratios significativos: la empresa no reporta actividad operativa ni activos relevantes.
                  </p>
                ) : (
                  <div className="space-y-10">
                    {!inactive && <StarRatios years={tableYears} byYear={byYear} dist={dist} />}
                    <div>
                      <h3 className="text-lg font-semibold">Todos los indicadores</h3>
                      {peerGroup && !inactive && (
                        <p className="mt-1 text-sm text-muted">
                          La referencia (semáforo) es la posición entre las {peerGroup.benchmark.n.toLocaleString("es-EC")}{" "}
                          empresas activas más cercanas en tamaño de la {peerGroup.levelLabel} (CIIU{" "}
                          <span className="font-mono">{peerGroup.prefix}</span>).
                        </p>
                      )}
                      {structureOnly && (
                        <p className="mt-1 text-sm text-muted">
                          Solo se muestran ratios de estructura del balance; los de rentabilidad y gestión no aplican
                          sin ingresos.
                        </p>
                      )}
                      <div className="mt-4">
                        <ViewToggle
                          cards={
                            <RatiosCards
                              years={tableYears}
                              byYear={byYear}
                              dist={dist}
                              only={structureOnly ? STRUCTURE_KEYS : undefined}
                              showBenchmark={!inactive}
                            />
                          }
                          table={
                            <RatiosTable
                              years={tableYears}
                              byYear={byYear}
                              dist={dist}
                              only={structureOnly ? STRUCTURE_KEYS : undefined}
                              showBenchmark={!inactive}
                            />
                          }
                        />
                      </div>
                      {!structureOnly && (
                        <p className="mt-3 text-xs text-muted">
                          Rentabilidad (neta y operacional), cobertura de intereses, apalancamiento, endeudamiento
                          patrimonial, impacto de gastos y períodos de cobranza y pago se recalculan con las cifras
                          exactas de cada empresa; la Superintendencia los trae con errores (signo perdido en pérdidas,
                          días inverosímiles). Un guion indica que no es calculable (p. ej. patrimonio negativo). Margen
                          bruto, endeudamiento del activo y rotación de activos también son exactos (la fuente los trunca a
                          2 decimales); liquidez, prueba ácida y otras rotaciones vienen de la Superintendencia con 2
                          decimales. Ver la <Link href="/acerca" className="text-brand hover:underline">metodología</Link>.
                        </p>
                      )}
                    </div>
                    {!inactive && (
                      <PeersTab
                        group={peerGroup}
                        ownName={company.nombre}
                        own={{
                          ingresos: ownIngresos > 0 ? ownIngresos : null,
                          roe: typeof curValues.roe === "number" ? curValues.roe : null,
                          margen: typeof curValues.rent_neta_ventas === "number" ? curValues.rent_neta_ventas : null,
                          liquidez:
                            typeof curValues.liquidez_corriente === "number"
                              ? curValues.liquidez_corriente
                              : typeof m.liquidez_corriente === "number"
                                ? m.liquidez_corriente
                                : null,
                        }}
                      />
                    )}
                  </div>
                ),
            },
            ...(inactive
              ? []
              : [
                  {
                    id: "riesgo",
                    label: alertCount > 0 ? `Alertas y crédito · ${alertCount}` : "Alertas y crédito",
                    content: (
                      <RiskTab
                        score={score}
                        flags={flags}
                        year={current.anio}
                        dist={dist}
                        groupLabel={peerGroup ? `${peerGroup.levelLabel} (CIIU ${peerGroup.prefix})` : null}
                        benchN={peerGroup?.benchmark.n ?? 0}
                      />
                    ),
                  },
                ]),
            {
              id: "estados",
              label: "Estados financieros",
              content:
                balanceRows.length === 0 ? (
                  <p className="text-sm text-muted">
                    El detalle línea por línea del balance está disponible desde el año 2019.
                  </p>
                ) : (
                  <StatementsView
                    rows={niifRows}
                    names={names}
                    csvHref={`/api/empresa/${company.ruc}/estados`}
                    sriYears={sriYears}
                    detailYear={current.anio}
                    detail={
                      balanceSheet ? (
                        <BalanceSheetView
                          data={balanceSheet.data}
                          names={balanceSheet.names}
                          catalogId={balanceSheet.catalog_id}
                        />
                      ) : (
                        <p className="text-sm text-muted">No hay detalle de cuentas para {current.anio}.</p>
                      )
                    }
                  />
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function change(cur: number | null | undefined, prev: number | null | undefined): number | null {
  if (typeof cur !== "number" || typeof prev !== "number" || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

function Stat({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {delta != null && (
        <div className={`mt-0.5 text-xs tabular-nums ${delta >= 0 ? "text-positive" : "text-negative"}`}>
          {delta >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(delta), 1)} vs año anterior
        </div>
      )}
    </div>
  );
}
