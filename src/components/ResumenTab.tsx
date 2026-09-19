import type { ReactNode } from "react";
import type { CompanyYearFinancial, RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatCompactMoney, formatNumber, formatPercent, formatRatioValue } from "@/lib/format";
import { C, EVENTS } from "@/components/charts";
import LineInteractive, { type Unit } from "@/components/LineInteractive";
import { RankBanner, SixTiles, VerticalEquations, type Amounts } from "@/components/SummaryBlocks";
import { EmployeesCard, RankCard } from "@/components/TrajectoryCards";
import DistributionChart, { type DistItem } from "@/components/DistributionChart";

export type Facts = { label: string; value: ReactNode }[];

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function Card({ title, sub, note, children }: { title: string; sub?: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold leading-snug">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      <div className="mt-2">{children}</div>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

const change = (a: number | null, b: number | null) => (a !== null && b !== null && a > 0 ? b / a - 1 : null);
const verb = (c: number) => (c >= 0 ? "crecieron" : "cayeron");

export default function ResumenTab({
  financials,
  byYear,
  currentYear,
  segment,
  universe,
  facts,
  dist,
  groupLabel,
  benchN,
}: {
  financials: CompanyYearFinancial[];
  byYear: Record<number, YearRatios>;
  currentYear: number;
  segment: ReactNode;
  universe: Record<number, number>;
  facts: Facts;
  dist: Record<string, RatioDist>;
  groupLabel: string | null;
  benchN: number;
}) {
  const sorted = [...financials].sort((a, b) => a.anio - b.anio);
  const trend = sorted
    .filter((f) => f.anio >= 2015 && f.anio <= currentYear && ((f.metrics.ingresos_ventas ?? 0) > 0 || (f.metrics.activos ?? 0) > 0))
    .slice(-10);
  const cur = sorted.find((f) => f.anio === currentYear);
  const m = cur?.metrics ?? {};
  const cats = trend.map((f) => String(f.anio));
  const met = (k: string) => trend.map((f) => num(f.metrics[k]));
  const val = (k: string) => trend.map((f) => num(byYear[f.anio]?.values[k]));
  const ven = (f: CompanyYearFinancial) =>
    (f.metrics.ingresos_ventas ?? 0) > 0 ? (f.metrics.ingresos_ventas as number) : num(f.metrics.ingresos_totales);
  const spansBreak = trend.some((f) => f.anio <= 2021) && trend.some((f) => f.anio >= 2022);
  const has = (arr: (number | null)[], n = 2) => arr.filter((v) => v !== null).length >= n;
  const first = trend[0];
  const lastT = trend[trend.length - 1];

  const act = num(m.activos);
  const pat = num(m.patrimonio);
  const amounts: Amounts = {
    activos: act,
    pasivos: act !== null && pat !== null ? act - pat : null,
    patrimonio: pat,
    ingresos: num(m.ingresos_ventas),
    utilidad: num(m.utilidad_neta),
  };

  // Ingresos vs utilidad neta
  const ingS = met("ingresos_ventas");
  const utiS = met("utilidad_neta");
  const cIng = first && lastT ? change(num(first.metrics.ingresos_ventas), num(lastT.metrics.ingresos_ventas)) : null;
  const cUti = first && lastT ? change(num(first.metrics.utilidad_neta), num(lastT.metrics.utilidad_neta)) : null;
  const ivuTitle =
    cIng !== null && first
      ? `Los ingresos ${verb(cIng)} ${formatPercent(Math.abs(cIng), 0)} desde ${first.anio}` +
        (cUti !== null ? `; la utilidad neta, ${cUti >= 0 ? "" : "-"}${formatPercent(Math.abs(cUti), 0)}` : "")
      : "Ingresos vs utilidad neta";
  // Productividad
  const prod = trend.map((f) => {
    const v = ven(f);
    const e = num(f.metrics.n_empleados);
    return v && e && e > 0 ? v / e : null;
  });
  const pFirst = prod.find((v) => v !== null) ?? null;
  const pLast = [...prod].reverse().find((v) => v !== null) ?? null;
  const pChange = change(pFirst, pLast);

  // Ciclo de efectivo (CCC = DSO + DIO - DPO); plazos absurdos (rotaciones casi nulas) se omiten.
  const ccc = val("ccc").map((v) => (v !== null && Math.abs(v) <= 1500 ? v : null));
  const cccNow = num(byYear[currentYear]?.values.ccc);

  // Indicadores de rentabilidad y liquidez en el tiempo
  const lineTitle = (name: string, vals: (number | null)[], fmt: (v: number) => string) => {
    const idx = vals.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) return name;
    const f = idx[0];
    const l = idx[idx.length - 1];
    const vf = vals[f] as number;
    const vl = vals[l] as number;
    return f === l ? `${name}: ${fmt(vl)} en ${cats[l]}` : `${name} ${fmt(vl)} en ${cats[l]}, frente a ${fmt(vf)} en ${cats[f]}`;
  };
  const roeS = val("roe");
  const roaS = val("roa");
  // Sin costos reportados el EBITDA queda sobrestimado (márgenes de 100%): esos años se omiten.
  const ebitdaS = val("margen_ebitda").map((v, i) => ((trend[i].metrics.costos_ventas_prod ?? 0) > 0 ? v : null));
  const liqS = val("liquidez_corriente");
  const ratioCards: { key: string; name: string; title: string; sub: string; unit: Unit; values: (number | null)[] }[] = [
    {
      key: "roe",
      name: "ROE",
      title: lineTitle("El ROE", roeS, (v) => formatPercent(v, 1)),
      sub: "Rentabilidad del patrimonio: utilidad neta ÷ patrimonio",
      unit: "percent" as Unit,
      values: roeS,
    },
    {
      key: "roa",
      name: "ROA",
      title: lineTitle("El ROA", roaS, (v) => formatPercent(v, 1)),
      sub: "Rentabilidad de los activos: utilidad neta ÷ activos",
      unit: "percent" as Unit,
      values: roaS,
    },
    {
      key: "ebitda",
      name: "Margen EBITDA",
      title: lineTitle("El margen EBITDA", ebitdaS, (v) => formatPercent(v, 1)),
      sub: "EBITDA aproximado ÷ ingresos (solo años con balance NIIF)",
      unit: "percent" as Unit,
      values: ebitdaS,
    },
    {
      key: "liq",
      name: "Razón corriente",
      title: lineTitle("La razón corriente", liqS, (v) => formatNumber(v, 2)),
      sub: "Activo corriente ÷ pasivo corriente: veces que cubre sus deudas de corto plazo",
      unit: "ratio" as Unit,
      values: liqS,
    },
  ].filter((c) => has(c.values));

  const ranks = sorted
    .filter((f) => typeof f.posicion_general === "number" && f.posicion_general > 0 && f.anio <= currentYear)
    .slice(-8)
    .map((f) => ({ anio: f.anio, value: f.posicion_general as number }));
  const emp = sorted
    .filter((f) => (num(f.metrics.n_empleados) ?? 0) > 0 && f.anio <= currentYear)
    .slice(-12)
    .map((f) => ({ anio: f.anio, value: f.metrics.n_empleados as number }));

  const distItems: DistItem[] = [
    { key: "rent_neta_ventas", label: "Margen neto", dist: dist.rent_neta_ventas, fmt: (v) => formatRatioValue("rent_neta_ventas", v, 1), dir: "higher" },
    { key: "roe", label: "ROE", dist: dist.roe, fmt: (v) => formatRatioValue("roe", v, 1), dir: "higher" },
    { key: "end_activo", label: "Endeudamiento del activo", dist: dist.end_activo, fmt: (v) => formatRatioValue("end_activo", v, 1), dir: "lower" },
  ];

  return (
    <div className="space-y-5">
      <SixTiles a={amounts} />
      <RankBanner year={currentYear} rank={cur?.posicion_general ?? null} universe={universe[currentYear] ?? null} />
      <VerticalEquations year={currentYear} a={amounts} />

      {trend.length >= 2 && (
        <div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <Card title={ivuTitle} sub="Cada línea tiene su propia escala; pasa el cursor por un punto para ver el valor de ese año">
            <LineInteractive
              categories={cats}
              events={EVENTS}
              unit="money"
              stacked
              series={[
                { name: "Ingresos", color: C.gray, values: ingS },
                { name: "Utilidad neta", color: C.blue, values: utiS },
              ]}
            />
          </Card>
          {has(prod) && (
            <Card
              title={
                pLast !== null && pChange !== null && first
                  ? `Cada empleado genera ${formatCompactMoney(pLast)} en ingresos, ${formatPercent(Math.abs(pChange), 0)} ${pChange >= 0 ? "más" : "menos"} que en ${first.anio}`
                  : "Productividad: ingresos por empleado"
              }
              sub="Ingresos por empleado, con su tendencia (línea punteada)"
            >
              <LineInteractive
                categories={cats}
                trend
                events={EVENTS}
                unit="money"
                series={[{ name: "Ingresos por empleado", color: C.blue, values: prod }]}
              />
            </Card>
          )}
          {ratioCards.map((c) => (
            <Card key={c.key} title={c.title} sub={c.sub}>
              <LineInteractive categories={cats} events={EVENTS} unit={c.unit} series={[{ name: c.name, color: C.blue, values: c.values }]} />
            </Card>
          ))}
          {has(ccc, 1) && (
            <Card
              title={
                cccNow !== null
                  ? cccNow >= 0
                    ? `El capital queda atrapado ${formatNumber(cccNow, 0)} días en la operación`
                    : `Los proveedores financian ${formatNumber(Math.abs(cccNow), 0)} días de la operación`
                  : "Ciclo de conversión de efectivo (CCC)"
              }
              sub="CCC = días de cobro + días de inventario − días de pago; disponible en los años con balance NIIF"
            >
              <LineInteractive
                categories={cats}
                events={EVENTS}
                unit="days"
                series={[{ name: "Ciclo de efectivo (CCC)", color: C.blue, values: ccc }]}
              />
            </Card>
          )}
          <RankCard ranks={ranks} universe={universe} />
          <EmployeesCard points={emp} />
          {segment}
        </div>
      )}
      {trend.length < 2 && segment}

      <DistributionChart items={distItems} groupLabel={groupLabel ?? "misma actividad"} n={benchN} />

      {spansBreak && (
        <p className="text-xs text-muted">
          Hasta 2021 los datos provienen del formulario tributario del SRI y desde 2022 de estados NIIF; las series antes y
          después de 2022 pueden no ser comparables línea por línea. Las líneas rojas punteadas marcan hitos (2020 pandemia,
          2024 crisis energética).
        </p>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold">Ficha de la empresa</h3>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-[11px] uppercase tracking-wide text-muted">{f.label}</dt>
              <dd className="mt-0.5 leading-snug">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
