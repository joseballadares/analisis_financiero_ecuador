import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import Ticker from "@/components/home/Ticker";
import FeaturedCard from "@/components/home/FeaturedCard";
import ShuffleButton from "@/components/home/ShuffleButton";
import { getLatestRankingYear, getTopLevelSectors } from "@/lib/db";
import { getProvinceStats, getSectorOverview, getTopHome, type HomeCompany } from "@/lib/queries";
import { getInteresting, pickFeatured } from "@/lib/interesting";
import { formatCompactMoney, formatPercent, sentenceCase } from "@/lib/format";
import { CURRENT_VERSION } from "@/lib/versions";

export const dynamic = "force-dynamic";

// Selección aleatoria sin repetición (Fisher–Yates parcial).
function sample<T>(items: T[], n: number): T[] {
  const a = [...items];
  const out: T[] = [];
  while (out.length < n && a.length > 0) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  return out;
}

const pill = "rounded-full border border-border px-3 py-1 transition-colors hover:border-brand hover:text-brand";

export default async function Home() {
  const anio = await getLatestRankingYear();
  const [top, prov, overview, sectors, pool] = await Promise.all([
    getTopHome(anio),
    getProvinceStats(anio),
    getSectorOverview(anio),
    getTopLevelSectors(),
    // Si el cálculo tarda (primera visita tras un despliegue), la portada no espera: usa una muestra del top 500.
    Promise.race([getInteresting(anio).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 3500))]),
  ]);

  const tot = (year: number) => {
    const rows = prov.filter((p) => p.anio === year);
    return {
      empresas: rows.reduce((a, r) => a + r.empresas, 0),
      ingresos: rows.reduce((a, r) => a + r.ingresos, 0),
      activos: rows.reduce((a, r) => a + r.activos, 0),
    };
  };
  const cur = tot(anio);
  const prev = tot(anio - 1);
  const growth = (a: number, b: number) => (b > 0 ? a / b - 1 : null);

  const names = new Map(sectors.map((s) => [s.codigo, sentenceCase(s.descripcion)]));
  const sectorRows = overview
    .filter((s) => s.anio === anio && s.ingresos > 0)
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 6);

  const top10 = top.slice(0, 10);
  // Radar Estratégico (señales sobre 5 años); si no hay suficientes, una muestra del top 500.
  const featured =
    pool && pool.empresas.length >= 8 ? pickFeatured(pool, 8) : sample(top, 8).map((c) => ({ ...c, signals: undefined }));
  const tickerItems = sample(top, 24);

  const kpis: { label: string; value: string; delta: number | null }[] = [
    { label: "Empresas registradas", value: cur.empresas.toLocaleString("es-EC"), delta: growth(cur.empresas, prev.empresas) },
    { label: `Ingresos totales ${anio}`, value: formatCompactMoney(cur.ingresos), delta: growth(cur.ingresos, prev.ingresos) },
    { label: `Activos totales ${anio}`, value: formatCompactMoney(cur.activos), delta: growth(cur.activos, prev.activos) },
    { label: "Sectores económicos", value: String(names.size || sectorRows.length), delta: null },
  ];

  return (
    <div>
      <Ticker items={tickerItems} year={anio} />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider">
            <span className="rounded-full border border-border px-2.5 py-1 text-brand">Datos fiscales 2008–{anio} · SCVS</span>
            <span className="rounded-full border border-border px-2.5 py-1 text-muted">v{CURRENT_VERSION.version}</span>
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Inteligencia financiera <span className="text-brand">del Ecuador</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Estados financieros, ratios, comparables sectoriales e informes en PDF de {cur.empresas.toLocaleString("es-EC")} compañías,
            a partir de datos oficiales de la Superintendencia de Compañías.
          </p>
          <div className="mt-8 max-w-xl">
            <SearchBox />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>Explora:</span>
            <Link href="/ranking" className={pill}>Ranking</Link>
            <Link href="/sector" className={pill}>Sectores</Link>
            <Link href="/buscar" className={pill}>Búsqueda avanzada</Link>
            <Link href="/provincias" className={pill}>Provincias</Link>
            <Link href="/acerca" className={pill}>Metodología</Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span>Top empresas</span>
            <span>Ingresos {anio}</span>
          </div>
          <ol className="mt-3">
            {top.slice(0, 5).map((c) => (
              <li key={c.ruc} className="border-b border-border last:border-b-0">
                <Link href={`/empresa/${c.ruc}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand">
                  <span className="break-words">
                    <span className="mr-2 text-muted tabular-nums">{c.rank}.</span>
                    {c.nombre}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatCompactMoney(c.ingresos)}</span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">+ {(cur.empresas - 5).toLocaleString("es-EC")} empresas más</span>
            <Link href="/ranking" className="text-brand hover:underline">Ver todas →</Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <div>
              <div className="text-xl font-semibold text-brand">{anio - 2008 + 1}</div>
              <div className="text-[11px] uppercase text-muted">años</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-brand">{names.size || sectorRows.length}</div>
              <div className="text-[11px] uppercase text-muted">sectores</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-brand">30+</div>
              <div className="text-[11px] uppercase text-muted">ratios</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-6xl border-t border-border px-4 py-8 sm:px-6">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label}>
              <div className="text-2xl font-semibold tabular-nums text-brand sm:text-3xl">{k.value}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted">{k.label}</div>
              {k.delta !== null && (
                <div className={`mt-1 text-xs tabular-nums ${k.delta >= 0 ? "text-positive" : "text-negative"}`}>
                  {k.delta >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(k.delta), 1)} <span className="text-muted">vs {anio - 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Radar Estratégico</h2>
            <p className="mt-0.5 text-sm font-medium text-brand">Un Watchlist de Empresas con Alto Desempeño</p>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Historias para leer y seguir en el tiempo: empresas que destacan por crecer, rendir, mejorar o cambiar en los últimos
              5 años. Selección editorial automatizada, no una recomendación de inversión.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ShuffleButton />
            <Link href="/ranking?vista=radar" className="text-sm text-brand hover:underline">
              Ver la lista completa →
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((c) => (
            <FeaturedCard key={c.ruc} c={c} sector={c.sector ? names.get(c.sector) : undefined} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Top 10 empresas</h2>
            <p className="mt-1 text-sm text-muted">Por ingresos operacionales — año fiscal {anio}</p>
          </div>
          <Link href="/ranking" className="text-sm text-brand hover:underline">Ver ranking completo →</Link>
        </div>
        <TopTable rows={top10} />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sectores por ingresos</h2>
            <p className="mt-1 text-sm text-muted">Las seis ramas de actividad más grandes en {anio}</p>
          </div>
          <Link href="/sector" className="text-sm text-brand hover:underline">Todos los sectores →</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectorRows.map((s) => {
            const p = overview.find((x) => x.ciiu_n1 === s.ciiu_n1 && x.anio === anio - 1);
            const g = p && p.ingresos > 0 ? s.ingresos / p.ingresos - 1 : null;
            return (
              <Link
                key={s.ciiu_n1}
                href={`/sector/${s.ciiu_n1}`}
                className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand"
              >
                <div className="text-sm font-semibold leading-snug">{names.get(s.ciiu_n1) ?? s.ciiu_n1}</div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold tabular-nums text-brand">{formatCompactMoney(s.ingresos)}</span>
                  {g !== null && (
                    <span className={`text-xs tabular-nums ${g >= 0 ? "text-positive" : "text-negative"}`}>
                      {g >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(g), 1)}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted">{s.empresas.toLocaleString("es-EC")} empresas</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Estados financieros", "Situación financiera y resultado integral línea por línea desde 2019, con tendencia por cuenta y descarga en CSV."],
            ["Ratios y comparables", "Más de 30 razones financieras con semáforo frente a las 500 empresas más parecidas en tamaño y actividad."],
            ["Informe profesional en PDF", "Cada perfil incluye un informe de 12 páginas: estados financieros, análisis, comparación con pares y capacidad de pago."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Fuente: Superintendencia de Compañías, Valores y Seguros. Los datos se actualizan una vez al año con el cierre fiscal.
        </p>
      </section>
    </div>
  );
}

function TopTable({ rows }: { rows: HomeCompany[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5">#</th>
            <th className="px-4 py-2.5">Empresa</th>
            <th className="px-4 py-2.5 text-right">Ingresos</th>
            <th className="px-4 py-2.5 text-right">Activos</th>
            <th className="px-4 py-2.5 text-right">Utilidad neta</th>
            <th className="px-4 py-2.5 text-right">Margen neto</th>
            <th className="px-4 py-2.5 text-right">ROE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.ruc} className="border-b border-border last:border-b-0 hover:bg-surface">
              <td className="px-4 py-2.5 tabular-nums text-muted">{c.rank}</td>
              <td className="px-4 py-2.5">
                <Link href={`/empresa/${c.ruc}`} className="hover:text-brand hover:underline">
                  {c.nombre}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatCompactMoney(c.ingresos)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{formatCompactMoney(c.activos)}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${(c.utilidad ?? 0) < 0 ? "text-negative" : ""}`}>{formatCompactMoney(c.utilidad)}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${(c.margen ?? 0) < 0 ? "text-negative" : ""}`}>{c.margen === null ? "—" : formatPercent(c.margen, 1)}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${(c.roe ?? 0) < 0 ? "text-negative" : ""}`}>{c.roe === null ? "—" : formatPercent(c.roe, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
