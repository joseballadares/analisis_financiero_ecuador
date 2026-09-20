import type { Metadata } from "next";
import Link from "next/link";
import { getLatestRankingYear } from "@/lib/db";
import { getCapsule2008 } from "@/lib/capsule2008";
import { cumulativeInflation } from "@/lib/eggs/inflation";
import { formatCompactMoney, formatNumber, formatPercent } from "@/lib/format";
import { C, EVENTS } from "@/components/charts";
import LineInteractive from "@/components/LineInteractive";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "2008: cápsula del tiempo · Ecuador Financiero",
  robots: { index: false, follow: false },
};

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const signed = (v: number, d = 0) => `${v >= 0 ? "+" : "−"}${formatPercent(Math.abs(v), d)}`;
const title = (s: string) => s.replace(/\s+/g, " ").trim();

const CRISIS: { text: string; src: string; href: string }[] = [
  {
    text: "El 15 de septiembre de 2008 Lehman Brothers se declaró en quiebra, con más de US$ 600.000 millones en activos: la mayor quiebra de la historia de Estados Unidos.",
    src: "Wikipedia",
    href: "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers",
  },
  {
    text: "Ese día el Dow Jones cerró más de 500 puntos abajo (−4,4 %), su mayor caída en puntos en un solo día desde los atentados del 11 de septiembre de 2001.",
    src: "Wikipedia",
    href: "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers",
  },
  {
    text: "La quiebra llegó tras anunciarse una rebaja de su calificación de crédito, por su fuerte exposición a hipotecas subprime.",
    src: "Wikipedia",
    href: "https://en.wikipedia.org/wiki/Bankruptcy_of_Lehman_Brothers",
  },
  {
    text: "Para leer más sobre qué salió mal en Lehman y en la crisis: «Lehman Brothers And The Financial Crisis: What Went Wrong?».",
    src: "Forbes",
    href: "https://www.forbes.com/sites/miltonezrati/2018/09/17/lehman-and-the-financial-crisis-what-went-wrong/",
  },
  {
    text: "Bloomberg tituló ese día: «Lehman Files for Biggest Bankruptcy in U.S. After Suitors Balk».",
    src: "Bloomberg",
    href: "https://www.bloomberg.com/news/articles/2008-09-15/lehman-files-for-biggest-bankruptcy-in-u-s-after-suitors-balk",
  },
];

const WB = (code: string) => `https://data.worldbank.org/indicator/${code}?locations=EC`;
const ECUADOR: { text: string; src: string; href: string }[] = [
  {
    text: "Ecuador llevaba ocho años dolarizado: desde 2000 usaba el dólar, con el sucre fijado en 25.000 por dólar. Sin moneda propia, no podía devaluar ni imprimir dinero.",
    src: "Wikipedia",
    href: "https://es.wikipedia.org/wiki/Sucre_ecuatoriano",
  },
  {
    text: "La inflación de 2008 fue de 8,4 %, la más alta desde 2002. La economía creció 6,6 % ese año y solo 1,1 % en 2009.",
    src: "Banco Mundial",
    href: WB("FP.CPI.TOTL.ZG"),
  },
  {
    text: "Las remesas de los emigrantes bajaron de US$ 3.341 millones en 2007 a US$ 3.089 millones en 2008 y US$ 2.742 millones en 2009 (−18 % frente a 2007).",
    src: "Banco Mundial",
    href: WB("BX.TRF.PWKR.CD.DT"),
  },
  {
    text: "El desempleo pasó de 3,9 % en 2008 a 4,6 % en 2009.",
    src: "Banco Mundial",
    href: WB("SL.UEM.TOTL.ZS"),
  },
  {
    text: "El 28 de septiembre de 2008, trece días después de la quiebra de Lehman, los ecuatorianos aprobaron en referendo una nueva Constitución.",
    src: "Wikipedia",
    href: "https://en.wikipedia.org/wiki/2008_Ecuadorian_constitutional_referendum",
  },
  {
    text: "En diciembre de 2008 el gobierno dejó de pagar US$ 31 millones de intereses de los bonos Global 2012, alegando que la deuda había sido contraída ilegalmente por un gobierno anterior.",
    src: "France 24",
    href: "https://www.france24.com/en/20081213-ecuador-defaults-foreign-debt-",
  },
];

export default async function Capsula2008Page() {
  const anioNow = await getLatestRankingYear();
  const cap = await getCapsule2008(anioNow);
  const infl = cumulativeInflation(2008, anioNow);
  const cats = cap.years.map(String);

  const alive = cap.companies.filter((c) => c.ingNow !== null);
  const real = (c: (typeof cap.companies)[number]) =>
    c.ingNow !== null ? c.ingNow / c.ing08 / (1 + infl.value) - 1 : null;
  const beat = alive.filter((c) => (real(c) ?? -1) > 0).length;
  const sum08 = alive.reduce((a, c) => a + c.ing08, 0);
  const sumNow = alive.reduce((a, c) => a + (c.ingNow ?? 0), 0);
  const moves = alive.filter((c) => c.rankNow !== null).map((c) => ({ c, d: c.rank08 - (c.rankNow as number) }));
  const up = moves.length ? moves.reduce((a, b) => (b.d > a.d ? b : a)) : null;
  const down = moves.length ? moves.reduce((a, b) => (b.d < a.d ? b : a)) : null;

  // Crecimiento mediano de las 10 frente a la inflación acumulada.
  const medianSeries = cap.years.map((_, i) =>
    median(
      cap.companies
        .filter((c) => c.series[i] !== null && c.series[0] !== null)
        .map((c) => (c.series[i] as number) / (c.series[0] as number) - 1),
    ),
  );
  const inflSeries = cap.years.map((y) => (y <= infl.lastYear ? cumulativeInflation(2008, y).value : null));

  const insights: string[] = [];
  if (alive.length) {
    insights.push(
      `Las ${alive.length} que siguen vendiendo pasaron de ${formatCompactMoney(sum08)} en 2008 a ${formatCompactMoney(sumNow)} en ${anioNow}: ${signed(sumNow / sum08 - 1)} en dólares corrientes y ${signed(sumNow / sum08 / (1 + infl.value) - 1)} descontando la inflación acumulada (${signed(infl.value)}).`,
    );
    insights.push(`${beat} de ${alive.length} crecieron por encima de la inflación.`);
  }
  if (up && down && up.d > 0) {
    insights.push(
      `La que más puestos ganó: ${title(up.c.nombre)}, del #${up.c.rank08} al #${formatNumber(up.c.rankNow as number, 0)}. ${
        down.d < 0 ? `La que más bajó: ${title(down.c.nombre)}, del #${down.c.rank08} al #${formatNumber(down.c.rankNow as number, 0)}.` : ""
      }`,
    );
  }
  if (cap.top100.conDatos > 0) {
    insights.push(
      `De las 100 mayores de 2008, ${cap.top100.conDatos} siguen reportando ventas y ${cap.top100.siguenTop100} siguen entre las 100 mayores de ${anioNow}.`,
    );
  }
  if (cap.post.comparables > 0) {
    insights.push(
      `En 2009, el primer año completo después de Lehman, ${cap.post.vendieronMenos} de ${cap.post.comparables} grandes empresas (ventas de más de US$ 5 millones en 2008) vendieron menos que un año antes (${formatPercent(cap.post.vendieronMenos / cap.post.comparables, 0)}).`,
    );
  }
  if (cap.numeroUno && cap.numeroUno.anios > 1) {
    insights.push(
      `${title(cap.numeroUno.nombre)} fue la #1 por ingresos en ${cap.numeroUno.anios} de los ${cap.numeroUno.total} años de la serie (${cap.years[0]}–${anioNow}).`,
    );
  }
  if (cap.n08 > 0 && cap.nNow > 0) {
    insights.push(
      `Curiosidad de los datos: en 2008 solo ${formatNumber(cap.n08, 0)} empresas declararon ingresos a la Superintendencia; en ${anioNow}, ${formatNumber(cap.nNow, 0)}.`,
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Cápsula del tiempo</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">2008: el año en que el mundo se cayó</h1>
      <div className="mt-5 rounded-xl border border-brand bg-brand-soft px-5 py-4">
        <p className="text-lg font-semibold text-brand sm:text-xl">
          Lehman Brothers quebró el 15 de septiembre de 2008.{" "}
          {alive.length === cap.companies.length && alive.length > 0
            ? `Estas ${alive.length} empresas siguen reportando ventas.`
            : `${alive.length} de estas ${cap.companies.length} empresas siguen reportando ventas.`}
        </p>
        <p className="mt-1 text-sm text-muted">
          Son las diez mayores de Ecuador en 2008 por ingresos operacionales. Aquí, dónde están hoy.
        </p>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">Las 10 mayores de 2008 y dónde están hoy</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">#2008</th>
                <th className="px-4 py-2.5">Empresa</th>
                <th className="px-4 py-2.5 text-right">Ventas 2008</th>
                <th className="px-4 py-2.5 text-right">Ventas {anioNow}</th>
                <th className="px-4 py-2.5 text-right" title="Cambio de las ventas descontando la inflación acumulada">Cambio real</th>
                <th className="px-4 py-2.5 text-right">Puesto {anioNow}</th>
                <th className="px-4 py-2.5 text-right">Margen neto {anioNow}</th>
              </tr>
            </thead>
            <tbody>
              {cap.companies.map((c) => {
                const r = real(c);
                return (
                  <tr key={c.ruc} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2.5 tabular-nums text-muted">{c.rank08}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/empresa/${c.ruc}`} className="font-medium hover:text-brand hover:underline">
                        {title(c.nombre)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatCompactMoney(c.ing08)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.ingNow === null ? "—" : formatCompactMoney(c.ingNow)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${r === null ? "text-muted" : r >= 0 ? "text-positive" : "text-negative"}`}>
                      {r === null ? "—" : signed(r)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{c.rankNow === null ? "—" : `#${formatNumber(c.rankNow, 0)}`}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${(c.margenNow ?? 0) < 0 ? "text-negative" : ""}`}>
                      {c.margenNow === null ? "—" : formatPercent(c.margenNow, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Ingresos operacionales declarados a la Superintendencia de Compañías. El cambio real usa la inflación anual promedio del Banco Mundial
          {infl.lastYear < anioNow ? ` (disponible hasta ${infl.lastYear})` : ""}. Fusiones, cambios de razón social o de la forma de reportar pueden explicar
          parte de los movimientos de puesto.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">¿Le ganaron a la inflación?</h2>
        <div className="mt-3 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Crecimiento mediano de las ventas de las 10 desde 2008, frente a la inflación acumulada.</p>
          <div className="mt-2">
            <LineInteractive
              categories={cats}
              unit="percent"
              events={EVENTS}
              series={[
                { name: "Ventas (mediana de las 10)", color: C.blue, values: medianSeries },
                { name: "Inflación acumulada", color: C.gray, values: inflSeries },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Cómo están hoy</h2>
        <ul className="mt-3 space-y-2 text-[15px]">
          {insights.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Sus ventas, año por año</h2>
        <div className="mt-3 grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          {cap.companies.map((c) => (
            <div key={c.ruc} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold leading-snug">
                  {c.rank08}. {title(c.nombre)}
                </h3>
                <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-brand">
                  #{c.rank08} → {c.rankNow === null ? "sin datos" : `#${formatNumber(c.rankNow, 0)}`}
                </span>
              </div>
              <div className="mt-2">
                <LineInteractive
                  categories={cats}
                  unit="money"
                  events={EVENTS}
                  series={[{ name: "Ventas", color: C.blue, values: c.series }]}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold tracking-tight">La crisis, en breve</h2>
          <ul className="mt-3 space-y-2.5 text-[15px]">
            {CRISIS.map((f) => (
              <li key={f.text} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>
                  {f.text}{" "}
                  <a href={f.href} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-xs text-brand underline">
                    {f.src}
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold tracking-tight">Ecuador en 2008</h2>
          <ul className="mt-3 space-y-2.5 text-[15px]">
            {ECUADOR.map((f) => (
              <li key={f.text} className="flex gap-2">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>
                  {f.text}{" "}
                  <a href={f.href} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-xs text-brand underline">
                    {f.src}
                  </a>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            Y de aquel Ecuador, ¿qué moneda quedó en la historia? Pista: escribe <span className="font-mono">/sucre</span> en la barra de direcciones.
          </p>
        </section>
      </div>

      <p className="mt-10 border-t border-border pt-4 text-xs text-muted">
        Fuentes: Superintendencia de Compañías, Valores y Seguros (ingresos); Banco Mundial (inflación, PIB, remesas, desempleo); Wikipedia, Bloomberg y France 24 (hechos); Forbes
        (lectura recomendada). Los enlaces abren la fuente original.
      </p>
    </div>
  );
}
