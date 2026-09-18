import Link from "next/link";
import { getTopLevelSectors } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SectorIndexPage() {
  const sectors = await getTopLevelSectors();

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Análisis por sector</h1>
      <p className="mt-2 text-muted">
        Ratios (mediana) y empresas destacadas por rama de actividad económica (CIIU).
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {sectors.map((s: { codigo: string; descripcion: string }) => (
          <Link
            key={s.codigo}
            href={`/sector/${s.codigo}`}
            className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand"
          >
            <div className="text-xs font-mono text-muted">{s.codigo}</div>
            <div className="mt-1 font-medium">{s.descripcion}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
