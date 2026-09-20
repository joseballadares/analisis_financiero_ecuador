import { notFound } from "next/navigation";
import Link from "next/link";
import { loadCompanyBundle } from "@/lib/companyData";
import { segmentName, sentenceCase, titleCase } from "@/lib/format";
import CompanyFicha, { type Fact } from "@/components/CompanyFicha";
import RatiosSections from "@/components/RatiosSections";
import RatiosExplorer from "@/components/RatiosExplorer";
import StarRatios from "@/components/StarRatios";
import BalanceSheetView from "@/components/BalanceSheetView";
import PeersTab from "@/components/PeersTab";
import StatementsView from "@/components/StatementsView";
import SegmentCard from "@/components/SegmentCard";
import ResumenTab from "@/components/ResumenTab";
import { STRUCTURE_KEYS } from "@/lib/derived";
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

  const loaded = await loadCompanyBundle(ruc, anioParam);
  if (loaded.kind === "notfound") notFound();
  if (loaded.kind === "nodata") {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
        <h1 className="text-2xl font-semibold">{loaded.company.nombre}</h1>
        <p className="mt-2 text-muted">RUC {loaded.company.ruc}</p>
        <p className="mt-6 text-sm text-muted">
          No hay información financiera registrada para esta empresa.
        </p>
      </div>
    );
  }
  const {
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
    curValues,
    score,
    flags,
  } = loaded.bundle;
  const alertCount = flags.filter((f) => f.severity !== "info").length;
  const rankNow = current.posicion_general;
  const actividad = current.ciiu_n6 ? `${current.ciiu_n6}${ciiuDesc ? ` · ${sentenceCase(ciiuDesc)}` : ""}` : "—";
  const facts: Fact[] = [
    { label: "RUC", value: company.ruc },
    { label: "Tipo de compañía", value: company.tipo?.trim() || "—" },
    { label: "Provincia", value: titleCase(company.provincia?.trim()) },
    { label: "Tamaño (SCVS)", value: segmentName(current.cod_segmento) },
    { label: "Mercado de Valores", value: filled.some((f) => f.metrics.cia_imvalores === 1) ? "Sí, participa" : "No" },
    { label: `Empleados ${current.anio}`, value: m.n_empleados ? Number(m.n_empleados).toLocaleString("es-EC") : "—" },
    {
      label: `Ranking ${current.anio}`,
      value: rankNow ? `#${rankNow.toLocaleString("es-EC")} de ${(universe[current.anio] ?? 0).toLocaleString("es-EC")}` : "—",
    },
    {
      label: "Actividad principal",
      wide: true,
      title: actividad,
      value: current.ciiu_n6 ? (
        <>
          <Link href={`/sector/${current.ciiu_n1}`} className="font-mono text-xs text-brand hover:underline">
            {current.ciiu_n6}
          </Link>
          {ciiuDesc ? ` · ${sentenceCase(ciiuDesc)}` : ""}
        </>
      ) : (
        "—"
      ),
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
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{company.nombre}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/api/empresa/${ruc}/informe?anio=${current.anio}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:border-brand hover:text-brand"
            title="Descarga el informe profesional en PDF (12 páginas) de este año"
          >
            <span aria-hidden>⬇</span> Informe profesional (PDF)
          </a>
          <YearSelect ruc={ruc} years={years} current={current.anio} />
        </div>
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

      <CompanyFicha facts={facts} />

      <div className="mt-6">
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
                  dist={dist}
                  groupLabel={peerGroup ? `${peerGroup.levelLabel} (CIIU ${peerGroup.prefix})` : null}
                  benchN={peerGroup?.benchmark.n ?? 0}
                  cashByYear={Object.fromEntries(
                    niifRows.filter((r) => typeof r.data["10101"] === "number").map((r) => [r.anio, r.data["10101"] as number]),
                  )}
                  segmentLabel={segmentName(current.cod_segmento)}
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
                    reportHref={`https://github.com/joseballadares/analisis_financiero_ecuador/issues/new?title=${encodeURIComponent(
                      `Error en estados financieros: ${company.nombre} (RUC ${company.ruc}) ${current.anio}`,
                    )}&body=${encodeURIComponent("Describe qué cifra parece incorrecta y cuál sería el valor esperado (con la fuente).")}`}
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
            {
              id: "ratios",
              label: "Ratios financieros",
              content:
                inactive && !structureOnly ? (
                  <p className="text-sm text-muted">
                    No hay ratios significativos: la empresa no reporta actividad operativa ni activos relevantes.
                  </p>
                ) : (
                  <RatiosSections
                    estrella={!inactive ? <StarRatios years={tableYears} byYear={byYear} dist={dist} /> : undefined}
                    porAnio={
                  <div className="space-y-10">
                    <div>
                      <h3 className="text-lg font-semibold">Ratios por año</h3>
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
                        <RatiosExplorer
                          years={tableYears}
                          byYear={byYear}
                          dist={dist}
                          only={structureOnly ? STRUCTURE_KEYS : undefined}
                          showBenchmark={!inactive}
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
                    }
                  />
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
          ]}
        />
      </div>
    </div>
  );
}
