import type { Metadata } from "next";
import Link from "next/link";
import { getLatestRankingYear, getTopLevelSectors } from "@/lib/db";
import { OLD_YEARS, getAntiquityReport, shareYoungerThan, type Group, type OldRow } from "@/lib/antiquity";
import { aniosDesde, formatFecha, olderThan } from "@/lib/catastro";
import { formatCompactMoney, formatNumber, segmentName, sentenceCase, titleCase } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Empresas más antiguas del Ecuador · Ecuador Financiero",
  robots: { index: false, follow: false },
};

const nf = (n: number) => formatNumber(n, 0);
const yrs = (iso: string) => Math.floor(aniosDesde(iso));
const pct1 = (x: number) => `${(x * 100).toFixed(1).replace(".", ",")} %`;

function Bar({ value, max, color = "var(--chart-blue)" }: { value: number; max: number; color?: string }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-border">
      <div className="h-2.5 rounded-full" style={{ width: `${Math.max(2, (value / (max || 1)) * 100)}%`, background: color }} />
    </div>
  );
}

function Card({ big, small }: { big: string; small: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums text-brand">{big}</div>
      <div className="mt-0.5 text-[13px] text-muted">{small}</div>
    </div>
  );
}

function GroupTable({ title, sub, rows, label }: { title: string; sub: string; rows: Group[]; label: (k: string) => string }) {
  const max = Math.max(...rows.map((r) => r.n50 / Math.max(r.n, 1)), 0.0001);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
      <table className="mt-3 w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="pb-1 font-medium">Grupo</th>
            <th className="pb-1 text-right font-medium">Activas</th>
            <th className="pb-1 text-right font-medium">50+ años</th>
            <th className="w-24 pb-1 pl-3 font-medium">% con 50+</th>
            <th className="pb-1 text-right font-medium">Edad mediana</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border">
              <td className="py-1.5 pr-2">{label(r.key)}</td>
              <td className="py-1.5 text-right tabular-nums">{nf(r.n)}</td>
              <td className="py-1.5 text-right tabular-nums">{nf(r.n50)}</td>
              <td className="py-1.5 pl-3">
                <div className="flex items-center gap-1.5">
                  <Bar value={r.n50 / Math.max(r.n, 1)} max={max} />
                  <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-muted">{pct1(r.n50 / Math.max(r.n, 1))}</span>
                </div>
              </td>
              <td className="py-1.5 text-right tabular-nums">{r.medianAge.toFixed(0)} años</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EmpresasAntiguasPage({ searchParams }: { searchParams: Promise<{ ruc?: string }> }) {
  const { ruc: rucParam } = await searchParams;
  const anio = await getLatestRankingYear();
  const [r, sectors] = await Promise.all([getAntiquityReport(anio), getTopLevelSectors()]);
  const sectorName = new Map(sectors.map((s) => [s.codigo, sentenceCase(s.descripcion)]));
  const th = (n: number) => r.thresholds.find((t) => t.years === n)?.n ?? 0;
  const mine = rucParam ? [...r.oldestActive, ...r.oldestOverall].find((x) => x.ruc === rucParam) : undefined;
  const oneIn = (n: number) => (n > 0 ? nf(Math.round(r.activas / n)) : "—");

  const sectorRows = [...r.sectors].filter((g) => g.n >= 200).sort((a, b) => b.n50 / b.n - a.n50 / a.n).slice(0, 8);
  const sectorMost = [...r.sectors].sort((a, b) => b.n50 - a.n50).slice(0, 6);
  const provRows = [...r.provinces].filter((g) => g.n >= 200).sort((a, b) => b.n50 / b.n - a.n50 / a.n).slice(0, 8);
  const sizeRows = [...r.sizes].sort((a, b) => Number(a.key) - Number(b.key));
  const bandOrder = ["Menos de US$ 100 mil", "US$ 100 mil – 1 M", "US$ 1 M – 10 M", "US$ 10 M – 100 M", "Más de US$ 100 M"];
  const bandRows = bandOrder.map((k) => r.bands.find((b) => b.key === k)).filter((x): x is Group => !!x);
  const maxDec = Math.max(...r.decades.map((d) => d.total), 1);
  const t = r.top100Sales;
  const mineYounger = mine ? shareYoungerThan(r.quantiles, mine.fecha_inicio) : null;

  const highlights: string[] = [];
  if (th(50) > 0 && sectorMost[0]) {
    highlights.push(
      `${sectorName.get(sectorMost[0].key) ?? sectorMost[0].key} reúne ${nf(sectorMost[0].n50)} de las ${nf(th(50))} empresas activas con 50 años o más (${pct1(sectorMost[0].n50 / th(50))}).`,
    );
  }
  const topProv = [...r.provinces].sort((a, b) => b.n50 - a.n50).slice(0, 2);
  if (th(50) > 0 && topProv.length === 2) {
    highlights.push(
      `${titleCase(topProv[0].key)} y ${titleCase(topProv[1].key)} concentran el ${pct1((topProv[0].n50 + topProv[1].n50) / th(50))} de las empresas activas de 50 años o más.`,
    );
  }
  const bigBand = bandRows[bandRows.length - 1];
  const smallBand = bandRows.find((b) => b.n >= 200);
  if (bigBand && smallBand && bigBand.key !== smallBand.key) {
    highlights.push(
      `Entre las empresas que venden más de US$ 100 millones, el ${pct1(bigBand.n50 / Math.max(bigBand.n, 1))} tiene 50 años o más; en el tramo «${smallBand.key}», el ${pct1(smallBand.n50 / Math.max(smallBand.n, 1))}.`,
    );
  }
  highlights.push(
    `De las ${nf(r.activas)} empresas activas, ${nf(th(OLD_YEARS))} (${pct1(th(OLD_YEARS) / r.activas)}) tienen ${OLD_YEARS} años o más y solo ${nf(th(100))} superan los 100.`,
  );

  const row = (x: OldRow, i: number, extra: React.ReactNode) => (
    <tr key={x.ruc} className={`border-b border-border last:border-b-0 ${x.ruc === rucParam ? "bg-brand-soft" : ""}`}>
      <td className="px-3 py-2 tabular-nums text-muted">{i + 1}</td>
      <td className="px-3 py-2">
        <Link href={`/empresa/${x.ruc}`} className="font-medium hover:text-brand hover:underline">
          {x.nombre}
        </Link>
        {yrs(x.fecha_inicio) >= OLD_YEARS && x.ventas !== null && <span className="ml-1.5 text-brand" title={`${OLD_YEARS} años o más y activa`}>★</span>}
      </td>
      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatFecha(x.fecha_inicio)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{yrs(x.fecha_inicio)}</td>
      {extra}
    </tr>
  );
  const th_ = "px-3 py-2.5";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Sorpresa · datos del SRI</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Empresas más antiguas del Ecuador</h1>
      <p className="mt-3 max-w-3xl text-muted">
        Ordenadas por su <strong className="text-foreground">inicio de actividades</strong> registrado en el catastro del SRI. De las {nf(r.poblacion)} compañías con fecha
        válida, {nf(r.activas)} siguen vendiendo en {r.anioNow}. Aquí, cuáles son las más veteranas y cómo les va hoy.
      </p>

      {mine && (
        <div className="mt-6 rounded-xl border border-brand bg-brand-soft px-5 py-4">
          <p className="text-sm text-muted">Tu empresa</p>
          <p className="text-lg font-semibold text-brand">
            {mine.nombre}: inició actividades el {formatFecha(mine.fecha_inicio)} ({yrs(mine.fecha_inicio)} años)
            {mineYounger !== null && mine.ventas !== null ? ` y es más antigua ${olderThan(mineYounger)}` : ""}.
          </p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Qué tan raro es llegar a viejo</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card big={nf(th(100))} small={`empresas activas con 100 años o más (1 de cada ${oneIn(th(100))})`} />
          <Card big={nf(th(OLD_YEARS))} small={`con ${OLD_YEARS} años o más: el ${pct1(th(OLD_YEARS) / r.activas)} de las activas`} />
          <Card big={nf(th(50))} small={`con 50 años o más: el ${pct1(th(50) / r.activas)}`} />
          <Card big={`${r.medianAge.toFixed(0)} años`} small="edad mediana de las empresas activas" />
        </div>
        <p className="mt-3 text-sm text-muted">
          La mitad de las empresas activas tiene menos de {Math.ceil(r.medianAge)} años desde su inicio de actividades y el {pct1(th(25) / r.activas)} supera los 25.
          Superar el siglo es excepcional: {th(100)} lo lograron.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Las más antiguas del Ecuador… ¿siguen activas en {r.anioNow}?</h2>
        <p className="mt-1 text-sm text-muted">Las {r.oldestOverall.length} fechas de inicio más antiguas del catastro, con su situación hoy.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <th className={th_}>#</th>
                <th className={th_}>Empresa</th>
                <th className={th_}>Inicio de actividades</th>
                <th className={`${th_} text-right`}>Años</th>
                <th className={th_}>Provincia</th>
                <th className={th_}>Estado SRI</th>
                <th className={`${th_} text-right`}>Ventas {r.anioNow}</th>
                <th className={`${th_} text-center`}>¿Activa?</th>
              </tr>
            </thead>
            <tbody>
              {r.oldestOverall.map((x, i) =>
                row(
                  x,
                  i,
                  <>
                    <td className="px-3 py-2 text-muted">{titleCase(x.provincia)}</td>
                    <td className="px-3 py-2 text-muted">{titleCase(x.estado)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{x.ventas !== null ? formatCompactMoney(x.ventas) : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      {x.ventas !== null ? <span className="font-semibold text-positive">Sí</span> : <span className="text-negative">No</span>}
                    </td>
                  </>,
                ),
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          «Activa» significa que declaró ventas en {r.anioNow}. Un estado «Pasivo» o «Suspendido» en el SRI no siempre implica que la empresa haya dejado de existir.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Las más antiguas que siguen activas: cómo les va en {r.anioNow}</h2>
        <p className="mt-1 text-sm text-muted">
          Las {r.oldestActive.length} más veteranas con ventas en {r.anioNow}. La estrella (★) marca las de {OLD_YEARS} años o más.
        </p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <th className={th_}>#</th>
                <th className={th_}>Empresa</th>
                <th className={th_}>Inicio de actividades</th>
                <th className={`${th_} text-right`}>Años</th>
                <th className={th_}>Sector</th>
                <th className={th_}>Provincia</th>
                <th className={th_}>Tamaño</th>
                <th className={`${th_} text-right`}>Ventas</th>
                <th className={`${th_} text-right`}>Utilidad neta</th>
                <th className={`${th_} text-right`}>Activos</th>
                <th className={`${th_} text-right`}>Empleados</th>
              </tr>
            </thead>
            <tbody>
              {r.oldestActive.map((x, i) =>
                row(
                  x,
                  i,
                  <>
                    <td className="max-w-[14rem] px-3 py-2 text-muted">{x.ciiu_n1 ? (sectorName.get(x.ciiu_n1) ?? x.ciiu_n1) : "—"}</td>
                    <td className="px-3 py-2 text-muted">{titleCase(x.provincia)}</td>
                    <td className="px-3 py-2 text-muted">{segmentName(x.cod_segmento)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{x.ventas !== null ? formatCompactMoney(x.ventas) : "—"}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${(x.utilidad ?? 0) < 0 ? "text-negative" : ""}`}>{x.utilidad !== null ? formatCompactMoney(x.utilidad) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{x.activos !== null ? formatCompactMoney(x.activos) : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{x.empleados ? nf(x.empleados) : "—"}</td>
                  </>,
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Insights</h2>
        <ul className="mt-3 space-y-2 text-[15px]">
          {highlights.map((h) => (
            <li key={h} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold">¿Cuántas sobreviven según la década en que empezaron?</h3>
          <p className="mt-0.5 text-xs text-muted">Compañías registradas por década de inicio y qué parte declaró ventas en {r.anioNow}. Sirve para ver cuántas de cada generación siguen en pie.</p>
          <table className="mt-3 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-1 font-medium">Década</th>
                <th className="pb-1 text-right font-medium">Registradas</th>
                <th className="pb-1 text-right font-medium">Con ventas {r.anioNow}</th>
                <th className="w-40 pb-1 pl-3 font-medium">Sobrevive</th>
              </tr>
            </thead>
            <tbody>
              {r.decades
                .filter((d) => d.decade >= 1900 && d.total >= 1)
                .map((d) => (
                  <tr key={d.decade} className="border-t border-border">
                    <td className="py-1.5">{d.decade}s</td>
                    <td className="py-1.5 text-right tabular-nums">
                      <span className="mr-2 inline-block w-24 align-middle"><Bar value={d.total} max={maxDec} color="var(--chart-gray)" /></span>
                      {nf(d.total)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{nf(d.conVentas)}</td>
                    <td className="py-1.5 pl-3">
                      <div className="flex items-center gap-1.5">
                        <Bar value={d.conVentas / Math.max(d.total, 1)} max={0.6} />
                        <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-muted">{pct1(d.conVentas / Math.max(d.total, 1))}</span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <GroupTable
            title="Por sector: dónde hay más veteranas"
            sub="Sectores con más empresas activas de 50 años o más (número)"
            rows={sectorMost}
            label={(k) => sectorName.get(k) ?? k}
          />
          <GroupTable
            title="Por sector: dónde pesan más las veteranas"
            sub="Sectores (con 200+ activas) con mayor porcentaje de empresas de 50 años o más"
            rows={sectorRows}
            label={(k) => sectorName.get(k) ?? k}
          />
          <GroupTable title="Por provincia" sub="Provincias (con 200+ activas) con mayor porcentaje de empresas de 50 años o más" rows={provRows} label={(k) => titleCase(k)} />
          <GroupTable title="Por tamaño (clasificación de la Superintendencia)" sub="Porcentaje de empresas de 50 años o más según el tamaño" rows={sizeRows} label={(k) => segmentName(Number(k))} />
          <GroupTable title="Por tamaño de ventas" sub={`Ventas de ${r.anioNow}`} rows={bandRows} label={(k) => k} />

          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold">Las 100 mayores por ventas, frente al resto</h3>
            <p className="mt-0.5 text-xs text-muted">¿Las gigantes son también las veteranas?</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Card big={`${t.medianAge.toFixed(0)} años`} small={`edad mediana de las 100 mayores (${t.n50} tienen 50+ años)`} />
              <Card big={`${t.others.medianAge.toFixed(0)} años`} small={`edad mediana del resto (${pct1(t.others.n50 / Math.max(t.others.n, 1))} con 50+)`} />
            </div>
            <p className="mt-3 text-sm text-muted">
              Entre las 100 mayores, {pct1(t.n50 / 100)} tiene 50 años o más; en el resto de las activas, {pct1(t.others.n50 / Math.max(t.others.n, 1))}.
            </p>
          </div>
        </div>
      </section>

      <p className="mt-10 border-t border-border pt-4 text-xs leading-relaxed text-muted">
        Cómo leer esto: la fecha es la de <em>inicio de actividades</em> que consta en el catastro público del SRI, que puede diferir de la fecha de fundación de la empresa (muchas
        se registraron después de haber empezado a operar). Se descartaron las pocas fechas evidentemente erróneas (por ejemplo, años como 199 o 1190) y el valor de relleno
        1900-01-01. «Activa» se define por tener ventas declaradas en {r.anioNow} a la Superintendencia de Compañías. Fuentes:{" "}
        <a href="https://www.sri.gob.ec/datasets" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">SRI, catastro RUC (datos abiertos)</a> y Superintendencia de
        Compañías, Valores y Seguros. Corte: {r.fechaCorte}. Los datos personales no forman parte de este análisis.
      </p>
      <p className="mt-2 text-xs text-muted">
        <Link href="/" className="underline hover:text-foreground">Volver al inicio</Link>
      </p>
    </div>
  );
}
