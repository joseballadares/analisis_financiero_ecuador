import Link from "next/link";
import { getLatestRankingYear, getTopLevelSectors } from "@/lib/db";
import { getTopHome } from "@/lib/queries";
import { sentenceCase } from "@/lib/format";
import RankingTable from "@/components/RankingTable";

export const dynamic = "force-dynamic";

const LIMIT = 1000;

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string }>;
}) {
  const { anio: anioParam } = await searchParams;
  const latestYear = await getLatestRankingYear();
  const parsed = anioParam ? parseInt(anioParam, 10) : latestYear;
  const anio = Number.isFinite(parsed) ? parsed : latestYear;
  const [rows, sectors] = await Promise.all([getTopHome(anio, LIMIT), getTopLevelSectors()]);
  const names = Object.fromEntries(sectors.map((s) => [s.codigo, sentenceCase(s.descripcion)]));
  const years = Array.from({ length: 10 }, (_, i) => latestYear - i);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Ranking de empresas</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Las {LIMIT.toLocaleString("es-EC")} empresas con más ingresos operacionales — {anio}. Ordena con clic en el
            título de cada columna y filtra por nombre, sector o rango de cada indicador (importes en millones de
            dólares, ratios en porcentaje).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/ranking?anio=${y}`}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                y === anio ? "bg-brand text-white" : "border border-border text-muted hover:border-brand hover:text-brand"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <RankingTable rows={rows} sectors={names} />
      </div>
      <p className="mt-4 text-xs text-muted">
        El puesto se calcula por ingresos operacionales (ventas y servicios). La posición general que publica la
        Superintendencia usa otra base y puede diferir; la verás en el perfil de cada empresa.
      </p>
    </div>
  );
}
