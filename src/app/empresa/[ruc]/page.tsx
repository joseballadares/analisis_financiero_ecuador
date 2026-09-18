import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyByRuc,
  getCompanyFinancials,
  getCompanyBalanceSheet,
  getPeerGroup,
  type CompanyYearFinancial,
} from "@/lib/db";
import { getCatalogNames, getCompanyBalanceRows, getSegmentShare } from "@/lib/queries";
import { formatMoney, formatNumber, formatPercent, titleCase } from "@/lib/format";
import RatiosTable from "@/components/RatiosTable";
import StarRatios from "@/components/StarRatios";
import BalanceSheetView from "@/components/BalanceSheetView";
import PeersTab from "@/components/PeersTab";
import StatementsView from "@/components/StatementsView";
import SegmentCard from "@/components/SegmentCard";
import { BarChart, LineChart } from "@/components/charts";
import { fillFromBalance, needsBalanceFill, isInactive, derivedRatios, STRUCTURE_KEYS } from "@/lib/derived";
import { ratiosByYear } from "@/lib/star";
import Tabs from "@/components/Tabs";

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

  const [balanceRows, segmentShare] = await Promise.all([
    getCompanyBalanceRows(company.expediente),
    current.ciiu_n6 && !inactive
      ? getSegmentShare({ ciiuN6: current.ciiu_n6, anio: current.anio, ingresos: ownIngresos })
      : Promise.resolve(null),
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

  const dist = inactive ? {} : (peerGroup?.benchmark.dist ?? {});
  const structureOnly = inactive && (m.activos ?? 0) >= 10000;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
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
        <div className="flex items-center gap-1 flex-wrap">
          {years.map((y) => (
            <Link
              key={y}
              href={`/empresa/${ruc}?anio=${y}`}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                y === current.anio
                  ? "bg-brand text-white"
                  : "border border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {y}
            </Link>
          ))}
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
                        <RatiosTable
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
                    {!inactive && <PeersTab group={peerGroup} />}
                  </div>
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

function ResumenTab({ financials, segment }: { financials: CompanyYearFinancial[]; segment: React.ReactNode }) {
  const sorted = [...financials].sort((a, b) => a.anio - b.anio);
  const trend = sorted
    .filter((f) => f.anio >= 2015 && ((f.metrics.ingresos_ventas ?? 0) > 0 || (f.metrics.activos ?? 0) > 0))
    .slice(-10);
  const cats = trend.map((f) => String(f.anio));
  const d = trend.map((f) => derivedRatios(f.metrics));
  const spansBreak = trend.some((f) => f.anio <= 2021) && trend.some((f) => f.anio >= 2022);
  return (
    <div className="space-y-8">
      {trend.length >= 2 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Ingresos y utilidad neta">
            <BarChart
              categories={cats}
              series={[
                { name: "Ingresos", color: "var(--brand)", values: trend.map((f) => f.metrics.ingresos_ventas ?? null) },
                { name: "Utilidad neta", color: "var(--accent)", values: trend.map((f) => f.metrics.utilidad_neta ?? null) },
              ]}
            />
          </Card>
          <Card title="Activos y patrimonio">
            <BarChart
              categories={cats}
              series={[
                { name: "Activos", color: "var(--brand)", values: trend.map((f) => f.metrics.activos ?? null) },
                { name: "Patrimonio", color: "var(--accent)", values: trend.map((f) => f.metrics.patrimonio ?? null) },
              ]}
            />
          </Card>
          <Card title="Margen neto y ROE">
            <LineChart
              categories={cats}
              format={(v) => formatPercent(v, 0)}
              series={[
                { name: "Margen neto", color: "var(--brand)", values: d.map((x) => x.rent_neta_ventas ?? null) },
                { name: "ROE", color: "var(--accent)", values: d.map((x) => x.roe ?? null) },
              ]}
            />
          </Card>
          {segment}
          {spansBreak && (
            <p className="text-xs text-muted lg:col-span-2">
              Hasta 2021 los datos provienen del formulario tributario del SRI y desde 2022 de estados NIIF; las
              series antes y después de 2022 pueden no ser comparables línea por línea.
            </p>
          )}
        </div>
      )}
      {trend.length < 2 && segment}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">Año</th>
              <th className="px-4 py-2.5 text-right">Ingresos</th>
              <th className="px-4 py-2.5 text-right">Activos</th>
              <th className="px-4 py-2.5 text-right">Patrimonio</th>
              <th className="px-4 py-2.5 text-right">Utilidad neta</th>
              <th className="px-4 py-2.5 text-right">Empleados</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => (
              <tr key={f.anio} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5 font-medium">{f.anio}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(f.metrics.ingresos_ventas as number)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(f.metrics.activos as number)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(f.metrics.patrimonio as number)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(f.metrics.utilidad_neta as number)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(f.metrics.n_empleados as number, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
