import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompaniesBySector, getLatestRankingYear, getSectorMedians, getTopLevelSectors } from "@/lib/db";
import { getSectorOverview, getSectorSeries, getSectorSizeMix } from "@/lib/queries";
import RatiosGrid from "@/components/RatiosGrid";
import { BarChart, LineChart } from "@/components/charts";
import { formatCompactMoney, formatMoney, formatPercent, segmentName, sentenceCase } from "@/lib/format";

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

  const [latestYear, sectors] = await Promise.all([getLatestRankingYear(), getTopLevelSectors()]);
  const anio = anioParam ? parseInt(anioParam, 10) || latestYear : latestYear;
  const sectorMeta = sectors.find((s: { codigo: string }) => s.codigo === ciiu);
  if (!sectorMeta) notFound();
  const nombre = sentenceCase(sectorMeta.descripcion);

  const [series, mix, overview, medians, companies] = await Promise.all([
    getSectorSeries(ciiu, 2018, anio),
    getSectorSizeMix(ciiu, anio),
    getSectorOverview(anio),
    getSectorMedians(ciiu, anio),
    getCompaniesBySector(ciiu, anio, 30),
  ]);

  const cur = series.find((s) => s.anio === anio);
  const prev = series.find((s) => s.anio === anio - 1);
  const ranking = overview
    .filter((s) => s.anio === anio && s.ingresos > 0)
    .sort((a, b) => b.ingresos - a.ingresos);
  const rank = ranking.findIndex((s) => s.ciiu_n1 === ciiu) + 1;
  const natTotal = ranking.reduce((a, s) => a + s.ingresos, 0);
  const growth = cur && prev && prev.ingresos > 0 ? cur.ingresos / prev.ingresos - 1 : null;
  const top10Share = cur && cur.ingresos > 0 ? cur.top10 / cur.ingresos : null;
  const years = Array.from({ length: 8 }, (_, i) => latestYear - i);
  const cats = series.map((s) => String(s.anio));
  const spansBreak = series.some((s) => s.anio <= 2021) && series.some((s) => s.anio >= 2022);
  const totalMix = mix.reduce((a, m) => a + m.ingresos, 0);
  const totalMixEmp = mix.reduce((a, m) => a + m.empresas, 0);
  const mixRows = [1, 2, 3, 4, 0]
    .map((code) => {
      const rows = mix.filter((m) => (m.cod_segmento ?? 0) === code);
      return {
        code,
        empresas: rows.reduce((a, m) => a + m.empresas, 0),
        ingresos: rows.reduce((a, m) => a + m.ingresos, 0),
      };
    })
    .filter((m) => m.empresas > 0);
  const marginDelta =
    prev?.margen_mediano != null && cur?.margen_mediano != null ? cur.margen_mediano - prev.margen_mediano : null;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <Link href="/sector" className="text-sm text-brand hover:underline">
        ← Todos los sectores
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-muted">{ciiu}</div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{nombre}</h1>
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

      {cur ? (
        <>
          <p className="mt-4 text-muted">
            {nombre} reúne a {cur.empresas.toLocaleString("es-EC")} empresas con ingresos en {anio}, que suman{" "}
            {formatCompactMoney(cur.ingresos)}
            {natTotal > 0 ? ` (${formatPercent(cur.ingresos / natTotal, 1)} del total nacional)` : ""}
            {rank > 0 ? ` y lo ubican en el puesto ${rank} de ${ranking.length} sectores` : ""}.
            {growth !== null &&
              ` Sus ingresos ${growth >= 0 ? "crecieron" : "cayeron"} ${formatPercent(Math.abs(growth), 1)} frente a ${anio - 1}.`}
            {top10Share !== null &&
              ` Las diez mayores concentran el ${formatPercent(top10Share, 0)} de los ingresos${
                top10Share < 0.3 ? " (mercado fragmentado)" : top10Share > 0.6 ? " (mercado concentrado)" : ""
              }.`}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Kpi
              label="Ingresos totales"
              value={formatCompactMoney(cur.ingresos)}
              sub={growth !== null ? `${growth >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(growth), 1)} vs ${anio - 1}` : undefined}
              tone={growth}
            />
            <Kpi
              label="Margen neto mediano"
              value={formatPercent(cur.margen_mediano, 1)}
              sub={marginDelta !== null ? `${marginDelta >= 0 ? "▲" : "▼"} ${formatPp(marginDelta)} pp` : undefined}
              tone={marginDelta}
            />
            <Kpi
              label="Empresas con ingresos"
              value={cur.empresas.toLocaleString("es-EC")}
              sub={
                prev && prev.empresas > 0
                  ? `${cur.empresas >= prev.empresas ? "▲" : "▼"} ${formatPercent(Math.abs(cur.empresas / prev.empresas - 1), 1)} vs ${anio - 1}`
                  : undefined
              }
              tone={prev ? cur.empresas - prev.empresas : null}
            />
            <Kpi label="Ingreso mediano por empresa" value={formatCompactMoney(cur.ingreso_mediano)} />
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <ChartCard
              title="Evolución de ingresos"
              note={
                spansBreak
                  ? "Hasta 2021 los datos provienen del formulario del SRI y desde 2022 de estados NIIF; la serie tiene un quiebre de método."
                  : undefined
              }
            >
              <BarChart categories={cats} series={[{ name: "Ingresos", color: "var(--chart-blue)", values: series.map((s) => s.ingresos) }]} />
            </ChartCard>
            <ChartCard title="Empresas con ingresos reportados">
              <BarChart
                categories={cats}
                format={(v) => v.toLocaleString("es-EC")}
                series={[{ name: "Empresas", color: "var(--chart-gray)", values: series.map((s) => s.empresas) }]}
              />
            </ChartCard>
            <ChartCard title="Concentración: participación de las mayores empresas">
              <LineChart
                categories={cats}
                series={[
                  { name: "Top 10", color: "var(--chart-blue)", values: series.map((s) => (s.ingresos > 0 ? s.top10 / s.ingresos : null)) },
                  { name: "Top 5", color: "var(--chart-gray)", values: series.map((s) => (s.ingresos > 0 ? s.top5 / s.ingresos : null)) },
                ]}
              />
            </ChartCard>
            <ChartCard title="Margen neto mediano">
              <LineChart
                categories={cats}
                format={(v) => formatPercent(v, 1)}
                series={[{ name: "Margen neto mediano", color: "var(--chart-blue)", values: series.map((s) => s.margen_mediano) }]}
              />
            </ChartCard>
          </div>

          <h2 className="mt-12 text-lg font-semibold">Distribución por tamaño — {anio}</h2>
          <p className="mt-1 text-sm text-muted">Clasificación de la Superintendencia de Compañías (por empresa y por ingresos).</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5">Tamaño</th>
                  <th className="px-4 py-2.5 text-right">Empresas</th>
                  <th className="px-4 py-2.5 w-44">% de empresas</th>
                  <th className="px-4 py-2.5 text-right">Ingresos</th>
                  <th className="px-4 py-2.5 w-44">% de ingresos</th>
                </tr>
              </thead>
              <tbody>
                {mixRows.map((m) => (
                  <tr key={m.code} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5">{segmentName(m.code)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.empresas.toLocaleString("es-EC")}</td>
                    <Bar value={totalMixEmp ? m.empresas / totalMixEmp : 0} />
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCompactMoney(m.ingresos)}</td>
                    <Bar value={totalMix ? m.ingresos / totalMix : 0} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mt-6 text-sm text-muted">Sin datos de este sector para {anio}.</p>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="mb-1 text-lg font-semibold">Ratios (mediana) del sector — {anio}</h2>
          <p className="mb-4 text-xs text-muted">
            Mediana de las {medians.n.toLocaleString("es-EC")} empresas activas de mayores ingresos del sector.
          </p>
          <RatiosGrid metrics={medians.medians} />
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
                {companies.map((c) => (
                  <tr key={c.expediente} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5 text-muted tabular-nums">{c.posicion_general ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/empresa/${c.ruc}`} className="hover:text-brand hover:underline">
                        {c.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(c.metrics.ingresos_ventas as number)}</td>
                  </tr>
                ))}
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
          <Link href={`/buscar?sector=${ciiu}&anio=${anio}`} className="mt-3 inline-block text-sm text-brand hover:underline">
            Ver todas las empresas del sector →
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatPp(v: number) {
  return new Intl.NumberFormat("es-EC", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(v * 100));
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className={`mt-0.5 text-xs ${tone == null ? "text-muted" : tone >= 0 ? "text-positive" : "text-negative"}`}>{sub}</div>
      )}
    </div>
  );
}

function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <td className="px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 rounded-full bg-border">
          <div className="h-2 rounded-full" style={{ background: "var(--chart-blue)", width: `${Math.min(100, value * 100)}%` }} />
        </div>
        <span className="w-12 text-right text-xs tabular-nums text-muted">{formatPercent(value, 0)}</span>
      </div>
    </td>
  );
}
