import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCompanyByRuc,
  getCompanyFinancials,
  getCompanyBalanceSheet,
  getSectorIndicators,
  type CompanyYearFinancial,
} from "@/lib/db";
import { formatMoney, formatNumber } from "@/lib/format";
import RatiosGrid from "@/components/RatiosGrid";
import BalanceSheetView from "@/components/BalanceSheetView";
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
  const current = financials.find((f) => f.anio === selectedYear) ?? financials[0];
  const m = current.metrics;

  const [balanceSheet, sectorBenchmark] = await Promise.all([
    getCompanyBalanceSheet(company.expediente, current.anio),
    current.ciiu_n1 ? getSectorIndicators(current.ciiu_n1, current.anio) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{company.nombre}</h1>
          <p className="mt-1 text-sm text-muted">
            RUC {company.ruc} · {company.tipo?.trim()} · {company.provincia?.trim()}
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

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Ingresos" value={formatMoney(m.ingresos_ventas as number)} />
        <Stat label="Activos" value={formatMoney(m.activos as number)} />
        <Stat label="Patrimonio" value={formatMoney(m.patrimonio as number)} />
        <Stat label="Utilidad neta" value={formatMoney(m.utilidad_neta as number)} />
      </div>

      <div className="mt-10">
        <Tabs
          tabs={[
            {
              id: "resumen",
              label: "Resumen",
              content: <ResumenTab financials={financials} />,
            },
            {
              id: "ratios",
              label: "Ratios financieros",
              content: (
                <RatiosGrid
                  metrics={m}
                  benchmark={
                    sectorBenchmark
                      ? (sectorBenchmark.metrics as Record<string, number | null>)
                      : null
                  }
                />
              ),
            },
            {
              id: "estados",
              label: "Estados financieros",
              content: balanceSheet ? (
                <BalanceSheetView data={balanceSheet.data} names={balanceSheet.names} />
              ) : (
                <p className="text-sm text-muted">
                  El detalle línea por línea del balance está disponible desde el año 2019.
                </p>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ResumenTab({ financials }: { financials: CompanyYearFinancial[] }) {
  const sorted = [...financials].sort((a, b) => a.anio - b.anio);
  return (
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
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatMoney(f.metrics.ingresos_ventas as number)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatMoney(f.metrics.activos as number)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatMoney(f.metrics.patrimonio as number)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatMoney(f.metrics.utilidad_neta as number)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {formatNumber(f.metrics.n_empleados as number, 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
