import Link from "next/link";
import { getLatestRankingYear, getTopLevelSectors } from "@/lib/db";
import { getSectorOverview } from "@/lib/queries";
import { formatCompactMoney, formatPercent, sentenceCase } from "@/lib/format";
import { BubbleChart } from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function SectorIndexPage() {
  const anio = await getLatestRankingYear();
  const [sectors, stats] = await Promise.all([getTopLevelSectors(), getSectorOverview(anio)]);
  const names = new Map(sectors.map((s) => [s.codigo, sentenceCase(s.descripcion)]));

  const rows = sectors
    .map((s) => {
      const cur = stats.find((x) => x.ciiu_n1 === s.codigo && x.anio === anio);
      const prev = stats.find((x) => x.ciiu_n1 === s.codigo && x.anio === anio - 1);
      return {
        codigo: s.codigo,
        nombre: names.get(s.codigo) ?? s.codigo,
        empresas: cur?.empresas ?? 0,
        ingresos: cur?.ingresos ?? 0,
        margen: cur?.margen_mediano ?? null,
        growth: cur && prev && prev.ingresos > 0 ? cur.ingresos / prev.ingresos - 1 : null,
        delta: cur && prev ? cur.ingresos - prev.ingresos : null,
      };
    })
    .filter((r) => r.ingresos > 0)
    .sort((a, b) => b.ingresos - a.ingresos);

  const totalIng = rows.reduce((a, r) => a + r.ingresos, 0);
  const totalPrev = stats.filter((s) => s.anio === anio - 1).reduce((a, s) => a + s.ingresos, 0);
  const totalEmp = rows.reduce((a, r) => a + r.empresas, 0);
  const natGrowth = totalPrev > 0 ? totalIng / totalPrev - 1 : 0;
  const withGrowth = rows.filter((r) => r.delta !== null);
  const leader = rows[0];
  const engine = [...withGrowth].sort((a, b) => b.delta! - a.delta!)[0];
  const brake = [...withGrowth].sort((a, b) => a.delta! - b.delta!)[0];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Análisis por sector</h1>
      <p className="mt-2 text-muted">
        Tamaño, crecimiento y rentabilidad de cada rama de actividad económica (CIIU) — {anio}. Ingresos
        operacionales de las empresas que presentaron balance a la Superintendencia.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Empresas con ingresos" value={totalEmp.toLocaleString("es-EC")} />
        <Kpi
          label="Ingresos totales"
          value={formatCompactMoney(totalIng)}
          sub={totalPrev > 0 ? `${natGrowth >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(natGrowth), 1)} vs ${anio - 1}` : undefined}
        />
        <Kpi label="Sector líder" value={leader?.nombre ?? "—"} sub={leader ? formatCompactMoney(leader.ingresos) : undefined} small />
        <Kpi
          label="Motor del crecimiento"
          value={engine?.nombre ?? "—"}
          sub={engine ? `+${formatCompactMoney(engine.delta!)}` : undefined}
          small
        />
      </div>
      {brake && brake.delta! < 0 && (
        <p className="mt-3 text-sm text-muted">
          Mayor freno: <strong className="text-foreground">{brake.nombre}</strong> ({formatCompactMoney(brake.delta!)},{" "}
          {formatPercent(brake.growth!, 1)}).
        </p>
      )}

      <h2 className="mt-12 text-lg font-semibold">Mapa de sectores: tamaño, crecimiento y densidad</h2>
      <p className="mt-1 text-sm text-muted">
        Cada burbuja es un sector (eje X: crecimiento de ingresos; eje Y: ingresos totales, escala logarítmica;
        tamaño: número de empresas). A la derecha de la línea punteada crecen más que la economía en su conjunto.
      </p>
      <div className="mt-4 rounded-xl border border-border bg-surface p-3">
        <BubbleChart
          nationalGrowth={natGrowth}
          items={withGrowth.map((r) => ({
            id: r.codigo,
            label: r.nombre,
            growth: r.growth!,
            revenue: r.ingresos,
            size: r.empresas,
            color: r.growth! >= natGrowth ? "var(--brand)" : "var(--accent)",
          }))}
        />
      </div>

      <h2 className="mt-12 text-lg font-semibold">Todos los sectores</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Sector</th>
              <th className="px-4 py-2.5 text-right">Empresas</th>
              <th className="px-4 py-2.5 text-right">Ingresos</th>
              <th className="px-4 py-2.5 text-right">Vs {anio - 1}</th>
              <th className="px-4 py-2.5 text-right">Margen neto mediano</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.codigo} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/sector/${r.codigo}`} className="font-medium hover:text-brand">
                    <span className="mr-2 font-mono text-xs text-muted">{r.codigo}</span>
                    {r.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.empresas.toLocaleString("es-EC")}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCompactMoney(r.ingresos)}</td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums ${
                    r.growth === null ? "text-muted" : r.growth >= 0 ? "text-positive" : "text-negative"
                  }`}
                >
                  {r.growth === null ? "—" : `${r.growth >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(r.growth), 1)}`}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatPercent(r.margen, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Clasificación por el CIIU principal registrado en la Superintendencia; algunas empresas mantienen un
        CIIU desactualizado. El margen neto mediano usa empresas con ingresos de al menos $1.000.
      </p>
    </div>
  );
}

function Kpi({ label, value, sub, small }: { label: string; value: string; sub?: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums ${small ? "text-sm leading-snug" : "text-lg"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
