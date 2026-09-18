import Link from "next/link";
import { getTopCompaniesOverall, getLatestRankingYear } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const { anio: anioParam } = await searchParams;
  const latestYear = await getLatestRankingYear();
  const anio = anioParam ? parseInt(anioParam, 10) : latestYear;
  const companies = await getTopCompaniesOverall(anio, 100);
  const years = Array.from({ length: 10 }, (_, i) => latestYear - i);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Ranking de empresas
          </h1>
          <p className="mt-2 text-muted">
            Las 100 empresas con mayor posición según ingresos totales — {anio}.
          </p>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {years.map((y) => (
            <Link
              key={y}
              href={`/ranking?anio=${y}`}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                y === anio
                  ? "bg-brand text-white"
                  : "border border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Empresa</th>
              <th className="px-4 py-2.5">Actividad</th>
              <th className="px-4 py-2.5 text-right">Ingresos</th>
              <th className="px-4 py-2.5 text-right">Utilidad neta</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(
              (c) => (
                <tr key={c.expediente} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5 text-muted tabular-nums">{c.posicion_general}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/empresa/${c.ruc}`} className="hover:text-brand hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">{c.ciiu_n6}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatMoney(c.metrics.ingresos_ventas as number)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatMoney(c.metrics.utilidad_neta as number)}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
