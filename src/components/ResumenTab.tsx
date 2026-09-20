import type { ReactNode } from "react";
import type { CompanyYearFinancial, RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatCompactMoney, formatNumber, formatPercent, formatRatioValue } from "@/lib/format";
import { C, EVENTS } from "@/components/charts";
import LineInteractive, { type Unit, type LSeries } from "@/components/LineInteractive";
import { RankBanner, SixTiles, VerticalEquations, type Amounts } from "@/components/SummaryBlocks";
import { RankCard } from "@/components/TrajectoryCards";
import DistributionChart, { type DistItem } from "@/components/DistributionChart";

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function Card({ title, sub, formula, latest, children }: { title: string; sub?: string; formula?: string; latest?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug">{title}</h3>
        {latest && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-brand">{latest}</span>}
      </div>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
      {formula && (
        <p className="mt-1 text-xs text-muted">
          <span className="font-medium text-foreground">Fórmula:</span> {formula}
        </p>
      )}
      <div className="mt-2">{children}</div>
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
  dist,
  groupLabel,
  benchN,
}: {
  financials: CompanyYearFinancial[];
  byYear: Record<number, YearRatios>;
  currentYear: number;
  segment: ReactNode;
  universe: Record<number, number>;
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

  // Indicadores: sin costos reportados el EBITDA queda sobrestimado (márgenes de 100 %) y los días mayores a 2 años
  // no son plazos reales (rotaciones casi nulas); esos valores se omiten para no deformar las escalas.
  const withCosts = (arr: (number | null)[]) => arr.map((v, i) => ((trend[i].metrics.costos_ventas_prod ?? 0) > 0 ? v : null));
  const days = (k: string) => val(k).map((v) => (v !== null && v >= 0 && v <= 730 ? v : null));
  const ebitda = withCosts(val("ebitda"));
  const ebitdaM = withCosts(val("margen_ebitda"));
  const ccc = val("ccc").map((v) => (v !== null && Math.abs(v) <= 1500 ? v : null));

  const lastOf = (arr: (number | null)[], fmt: (v: number) => string) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      const v = arr[i];
      if (v !== null) return `${fmt(v)} · ${trend[i].anio}`;
    }
    return undefined;
  };
  const pct1 = (v: number) => formatPercent(v, 1);
  const dias = (v: number) => `${formatNumber(v, 0)} d`;
  const veces = (v: number) => formatNumber(v, 2);

  type Metric = {
    key: string;
    title: string;
    what: string;
    formula: string;
    unit: Unit;
    values: (number | null)[];
    fmt: (v: number) => string;
    series?: LSeries[];
  };
  const metrics: Metric[] = [
    {
      key: "ebitda",
      title: "EBITDA y EBITDA Margin",
      what: "Mide la rentabilidad operativa antes de intereses, impuestos, depreciación y amortización (aproximado: la depreciación reportada puede ser incompleta).",
      formula: "EBITDA ÷ Ingresos × 100",
      unit: "percent",
      values: ebitdaM,
      fmt: pct1,
      series: [
        { name: "EBITDA (US$)", color: C.gray, values: ebitda, unit: "money" },
        { name: "EBITDA Margin", color: C.blue, values: ebitdaM, unit: "percent" },
      ],
    },
    {
      key: "fcf",
      title: "Free Cash Flow (FCF)",
      what: "¿Cuánto efectivo genera realmente el negocio después de las inversiones necesarias? (estimado con variaciones del balance).",
      formula: "Flujo de caja operativo − CAPEX (aquí: utilidad neta − Δ capital de trabajo − Δ activos fijos)",
      unit: "money",
      values: val("fcf"),
      fmt: (v) => formatCompactMoney(v),
    },
    {
      key: "roic",
      title: "ROIC – Return on Invested Capital",
      what: "Permite evaluar si el negocio está generando retornos superiores al costo del capital invertido.",
      formula: "Utilidad operativa × (1 − 25 %) ÷ (Deuda financiera + Patrimonio − Efectivo)",
      unit: "percent",
      values: val("roic"),
      fmt: pct1,
    },
    {
      key: "dso",
      title: "DSO – Days Sales Outstanding",
      what: "¿Cuántos días tarda la empresa en convertir sus ventas en efectivo?",
      formula: "365 ÷ Rotación de cartera (cuentas por cobrar sobre ventas totales × días)",
      unit: "days",
      values: days("per_med_cobranza"),
      fmt: dias,
    },
    {
      key: "dio",
      title: "DIO – Days Inventory Outstanding",
      what: "¿Cuántos días permanece el inventario antes de venderse?",
      formula: "Inventario ÷ Costo de ventas × días",
      unit: "days",
      values: days("dio"),
      fmt: dias,
    },
    {
      key: "dpo",
      title: "DPO – Days Payable Outstanding",
      what: "¿Cuántos días tarda la empresa en pagar a sus proveedores?",
      formula: "Cuentas por pagar ÷ Costo de ventas × días (la fuente no informa las compras)",
      unit: "days",
      values: days("per_med_pago"),
      fmt: dias,
    },
    {
      key: "ccc",
      title: "Cash Conversion Cycle (CCC)",
      what: "Mide cuánto tiempo permanece el capital atrapado en la operación.",
      formula: "CCC = DSO + DIO − DPO",
      unit: "days",
      values: ccc,
      fmt: dias,
    },
    {
      key: "cr",
      title: "Current Ratio",
      what: "Mide la capacidad de cubrir obligaciones de corto plazo.",
      formula: "Activos corrientes ÷ Pasivos corrientes",
      unit: "ratio",
      values: val("liquidez_corriente"),
      fmt: veces,
    },
    {
      key: "nd",
      title: "Net Debt / EBITDA",
      what: "Indicador clave para analizar el nivel de apalancamiento y capacidad de pago: años de EBITDA que tomaría pagar la deuda neta (negativo = más efectivo que deuda).",
      formula: "(Deuda financiera − Efectivo) ÷ EBITDA",
      unit: "ratio",
      values: val("deuda_neta_ebitda"),
      fmt: veces,
    },
  ];
  const shown = metrics.filter((x) => has(x.values, 2));
  const hidden = metrics.length - shown.length;

  const ranks = sorted
    .filter((f) => typeof f.posicion_general === "number" && f.posicion_general > 0 && f.anio <= currentYear)
    .slice(-8)
    .map((f) => ({ anio: f.anio, value: f.posicion_general as number }));

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
          <Card title={ivuTitle} sub="Ingresos y utilidad neta por año; cada línea tiene su propia escala">
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
          {shown.map((x) => (
            <Card key={x.key} title={x.title} sub={x.what} formula={x.formula} latest={lastOf(x.values, x.fmt)}>
              <LineInteractive
                categories={cats}
                events={EVENTS}
                unit={x.unit}
                stacked={!!x.series}
                series={x.series ?? [{ name: x.title, color: C.blue, values: x.values }]}
              />
            </Card>
          ))}
        </div>
      )}
      {hidden > 0 && (
        <p className="text-xs text-muted">
          {hidden === 1 ? "Un indicador no se muestra" : `${hidden} indicadores no se muestran`}: requieren balance NIIF (desde 2022) con datos
          suficientes para esta empresa.
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <RankCard ranks={ranks} universe={universe} />
        {segment}
      </div>

      <DistributionChart items={distItems} groupLabel={groupLabel ?? "misma actividad"} n={benchN} />

      {spansBreak && (
        <p className="text-xs text-muted">
          Hasta 2021 los datos provienen del formulario tributario del SRI y desde 2022 de estados NIIF; las series antes y
          después de 2022 pueden no ser comparables línea por línea. Las líneas rojas punteadas marcan hitos (2020 pandemia,
          2024 crisis energética).
        </p>
      )}
    </div>
  );
}
