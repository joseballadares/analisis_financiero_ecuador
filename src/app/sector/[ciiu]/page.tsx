import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSectorIndicators,
  getSectorMedians,
  getCompaniesBySector,
  getLatestSectorYear,
  getTopLevelSectors,
} from "@/lib/db";
import RatiosGrid from "@/components/RatiosGrid";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SectorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ciiu: string }>;
  searchParams: Promise<{ anio?: string }>;
}) {
  const { ciiu } = await params;
  const { anio: anioParam } = await searchParams;

  const [latestYear, sectors] = await Promise.all([getLatestSectorYear(), getTopLevelSectors()]);
  const anio = anioParam ? parseInt(anioParam, 10) : latestYear;
  const sectorMeta = sectors.find((s: { codigo: string }) => s.codigo === ciiu);
  if (!sectorMeta) notFound();

  const [indicators, medians, companies] = await Promise.all([
    getSectorIndicators(ciiu, anio),
    getSectorMedians(ciiu, anio),
    getCompaniesBySector(ciiu, anio, 30),
  ]);

  const years = Array.from({ length: 7 }, (_, i) => latestYear - i);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <Link href="/sector" className="text-sm text-brand hover:underline">
        ← Todos los sectores
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-muted">{ciiu}</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {sectorMeta.descripcion}
          </h1>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {years.map((y) => (
            <Link
              key={y}
              href={`/sector/${ciiu}?anio=${y}`}
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

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Ratios (mediana) del sector — {anio}</h2>
          {indicators ? (
            <RatiosGrid metrics={{ ...(indicators.metrics as Record<string, number | null>), ...medians }} />
          ) : (
            <p className="text-sm text-muted">Sin datos de indicadores para este año.</p>
          )}
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold">Empresas destacadas — {anio}</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Empresa</th>
                  <th className="px-4 py-2.5 text-right">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(
                  (c) => (
                    <tr key={c.expediente} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5 text-muted tabular-nums">
                        {c.posicion_general ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/empresa/${c.ruc}`} className="hover:text-brand hover:underline">
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {formatMoney(c.metrics.ingresos_ventas as number)}
                      </td>
                    </tr>
                  )
                )}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted">
                      Sin empresas registradas para este año.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
