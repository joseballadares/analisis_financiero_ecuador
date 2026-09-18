import type { ReactNode } from "react";
import type { CompanyYearFinancial } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatNumber, formatPercent, formatCompactMoney } from "@/lib/format";
import { BalanceStructureChart, BarChart, ComboChart, EVENTS, LineChart } from "@/components/charts";
import EquationCards from "@/components/EquationCards";
import { EmployeesCard, RankCard } from "@/components/TrajectoryCards";

export type Facts = { label: string; value: ReactNode }[];

const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function Card({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

export default function ResumenTab({
  financials,
  byYear,
  currentYear,
  segment,
  universe,
  facts,
}: {
  financials: CompanyYearFinancial[];
  byYear: Record<number, YearRatios>;
  currentYear: number;
  segment: ReactNode;
  universe: Record<number, number>;
  facts: Facts;
}) {
  const sorted = [...financials].sort((a, b) => a.anio - b.anio);
  const trend = sorted
    .filter((f) => f.anio >= 2015 && f.anio <= currentYear && ((f.metrics.ingresos_ventas ?? 0) > 0 || (f.metrics.activos ?? 0) > 0))
    .slice(-10);
  const cur = sorted.find((f) => f.anio === currentYear);
  const m = cur?.metrics ?? {};
  const cats = trend.map((f) => String(f.anio));
  const val = (k: string) => trend.map((f) => num(byYear[f.anio]?.values[k]));
  const met = (k: string) => trend.map((f) => num(f.metrics[k]));
  const ven = (f: CompanyYearFinancial) => ((f.metrics.ingresos_ventas ?? 0) > 0 ? (f.metrics.ingresos_ventas as number) : num(f.metrics.ingresos_totales));
  const pasivos = trend.map((f) =>
    num(f.metrics.activos) !== null && num(f.metrics.patrimonio) !== null ? (f.metrics.activos as number) - (f.metrics.patrimonio as number) : null,
  );
  // Años sin costo de ventas reportado (fuente incompleta) dan márgenes de 100% engañosos: se omiten.
  const hasCost = trend.map((f) => (num(f.metrics.costos_ventas_prod) ?? 0) > 0);
  const mask = (arr: (number | null)[]) => arr.map((v, i) => (hasCost[i] ? v : null));
  const ratioOverRevenue = (k: string) =>
    mask(
      trend.map((f) => {
        const v = ven(f);
        const x = num(f.metrics[k]);
        return v && v > 0 && x !== null ? x / v : null;
      }),
    );
  const prod = trend.map((f) => {
    const v = ven(f);
    const e = num(f.metrics.n_empleados);
    return v && e && e > 0 ? v / e : null;
  });
  const spansBreak = trend.some((f) => f.anio <= 2021) && trend.some((f) => f.anio >= 2022);
  const has = (arr: (number | null)[], n = 2) => arr.filter((v) => v !== null).length >= n;

  const ranks = sorted
    .filter((f) => typeof f.posicion_general === "number" && f.posicion_general > 0 && f.anio <= currentYear)
    .slice(-8)
    .map((f) => ({ anio: f.anio, value: f.posicion_general as number }));
  const emp = sorted
    .filter((f) => (num(f.metrics.n_empleados) ?? 0) > 0 && f.anio <= currentYear)
    .slice(-12)
    .map((f) => ({ anio: f.anio, value: f.metrics.n_empleados as number }));

  const act = num(m.activos);
  const pat = num(m.patrimonio);
  const pas = act !== null && pat !== null ? act - pat : null;
  const ccc = [val("per_med_cobranza"), val("dio"), val("per_med_pago")];

  return (
    <div className="space-y-6">
      <EquationCards
        year={currentYear}
        activos={act}
        pasivos={pas}
        patrimonio={pat}
        ingresos={num(m.ingresos_ventas)}
        utilidad={num(m.utilidad_neta)}
      />

      {trend.length >= 2 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {act !== null && act > 0 && pat !== null && pas !== null && (
            <Card title={`Estructura del balance — ${currentYear}`} note="Activos = Pasivos + Patrimonio.">
              <BalanceStructureChart year={currentYear} activos={act} pasivos={pas} patrimonio={pat} />
            </Card>
          )}
          <Card
            title="Ingresos vs utilidad neta"
            note="La utilidad neta usa su propio eje (derecha) para poder compararla con los ingresos; la línea punteada es la tendencia de los ingresos."
          >
            <ComboChart
              categories={cats}
              bars={{ name: "Ingresos", color: "var(--brand)", values: met("ingresos_ventas") }}
              line={{ name: "Utilidad neta", color: "var(--accent)", values: met("utilidad_neta") }}
              events={EVENTS}
            />
          </Card>
          <Card title="Activos, pasivos y patrimonio">
            <BarChart
              categories={cats}
              trend
              events={EVENTS}
              series={[
                { name: "Activos", color: "var(--brand)", values: met("activos") },
                { name: "Pasivos", color: "var(--negative)", values: pasivos },
                { name: "Patrimonio", color: "var(--accent)", values: met("patrimonio") },
              ]}
            />
          </Card>
          <Card title="Márgenes">
            <LineChart
              categories={cats}
              trend
              events={EVENTS}
              format={(v) => formatPercent(v, 0)}
              series={[
                { name: "Margen bruto", color: "var(--brand)", values: mask(val("margen_bruto")) },
                { name: "Margen operacional", color: "var(--accent)", values: mask(val("margen_operacional")) },
                { name: "Margen neto", color: "var(--positive)", values: val("rent_neta_ventas") },
              ]}
            />
          </Card>
          <Card title="Rentabilidad: ROE y ROA">
            <LineChart
              categories={cats}
              trend
              events={EVENTS}
              series={[
                { name: "ROE", color: "var(--brand)", values: val("roe") },
                { name: "ROA", color: "var(--accent)", values: val("roa") },
              ]}
            />
          </Card>
          <Card title="Liquidez y endeudamiento" note="Razón corriente (veces) y endeudamiento del activo (pasivo ÷ activo).">
            <LineChart
              categories={cats}
              trend
              events={EVENTS}
              format={(v) => formatNumber(v, 1)}
              series={[
                { name: "Razón corriente", color: "var(--brand)", values: val("liquidez_corriente") },
                { name: "Endeudamiento del activo", color: "var(--negative)", values: val("end_activo") },
              ]}
            />
          </Card>
          <RankCard ranks={ranks} universe={universe} />
          <EmployeesCard points={emp} />
          {has(prod) && (
            <Card title="Productividad: ingresos por empleado">
              <BarChart
                categories={cats}
                trend
                events={EVENTS}
                series={[{ name: "Ingresos por empleado", color: "var(--brand)", values: prod }]}
                format={formatCompactMoney}
              />
            </Card>
          )}
          {has(ratioOverRevenue("costos_ventas_prod")) && (
            <Card title="Estructura de costos (% de los ingresos)">
              <LineChart
                categories={cats}
                trend
                events={EVENTS}
                format={(v) => formatPercent(v, 0)}
                series={[
                  { name: "Costo de ventas", color: "var(--brand)", values: ratioOverRevenue("costos_ventas_prod") },
                  { name: "Gastos de administración y ventas", color: "var(--accent)", values: ratioOverRevenue("gastos_admin_ventas") },
                  { name: "Gastos financieros", color: "var(--negative)", values: ratioOverRevenue("gastos_financieros") },
                ]}
              />
            </Card>
          )}
          {ccc.some((s) => has(s)) && (
            <Card title="Ciclo de efectivo (días)" note="Días de cobro, de inventario y de pago; disponible en los años con balance NIIF.">
              <LineChart
                categories={cats}
                trend
                events={EVENTS}
                format={(v) => `${formatNumber(v, 0)} d`}
                series={[
                  { name: "Días de cobro (DSO)", color: "var(--brand)", values: ccc[0] },
                  { name: "Días de inventario (DIO)", color: "var(--accent)", values: ccc[1] },
                  { name: "Días de pago (DPO)", color: "var(--negative)", values: ccc[2] },
                ]}
              />
            </Card>
          )}
          {segment}
        </div>
      )}
      {trend.length < 2 && segment}

      {spansBreak && (
        <p className="text-xs text-muted">
          Hasta 2021 los datos provienen del formulario tributario del SRI y desde 2022 de estados NIIF; las series antes y
          después de 2022 pueden no ser comparables línea por línea. Las líneas rojas marcan hitos (2020 pandemia, 2024
          crisis energética); las punteadas de color son la tendencia lineal de cada serie.
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
