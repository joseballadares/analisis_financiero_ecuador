import { formatCompactMoney, formatNumber, formatPercent } from "@/lib/format";

type Row = { label: string; value: string | null; note?: string };
type Section = { title: string; rows: Row[] };

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Resumen de una mirada del último año, en el estilo de un "Financial Highlights": secciones cortas con etiqueta y valor.
export default function FinancialHighlights({
  year,
  m,
  prevM,
  values,
  cash,
  segment,
  rankText,
}: {
  year: number;
  m: Record<string, number | null>;
  prevM?: Record<string, number | null>;
  values: Record<string, number | null>;
  cash: number | null;
  segment: string;
  rankText: string | null;
}) {
  const v = (k: string) => num(values[k]);
  const pct = (k: string, d = 1) => (v(k) === null ? null : formatPercent(v(k) as number, d));
  const ing = num(m.ingresos_ventas);
  const prevIng = num(prevM?.ingresos_ventas);
  const cost = num(m.costos_ventas_prod);
  const emp = num(m.n_empleados);
  const act = num(m.activos);
  const pat = num(m.patrimonio);
  const fmtM = (x: number | null) => (x === null ? null : formatCompactMoney(x));

  const sections: Section[] = [
    {
      title: "Ejercicio",
      rows: [
        { label: "Año fiscal", value: String(year) },
        { label: "Tamaño (SCVS)", value: segment },
        { label: "Ranking nacional", value: rankText },
        { label: "Empleados", value: emp && emp > 0 ? formatNumber(emp, 0) : null },
      ],
    },
    {
      title: "Rentabilidad",
      rows: [
        { label: "Margen neto", value: pct("rent_neta_ventas") },
        { label: "Margen operacional", value: pct("margen_operacional") },
        { label: "Margen EBITDA", value: pct("margen_ebitda"), note: "aprox." },
      ],
    },
    {
      title: "Eficiencia de gestión",
      rows: [
        { label: "ROA", value: pct("roa") },
        { label: "ROE", value: pct("roe") },
        { label: "ROIC", value: pct("roic"), note: "aprox." },
        { label: "Rotación de activos", value: v("rot_ventas") === null ? null : `${formatNumber(v("rot_ventas") as number, 2)} veces` },
      ],
    },
    {
      title: "Estado de resultados",
      rows: [
        { label: "Ingresos", value: fmtM(ing) },
        { label: "Crecimiento de ingresos", value: ing !== null && prevIng !== null && prevIng > 0 ? formatPercent(ing / prevIng - 1, 1) : null },
        { label: "Ganancia bruta", value: ing !== null && cost !== null && cost > 0 ? fmtM(ing - cost) : null },
        { label: "EBITDA", value: fmtM(v("ebitda")), note: "aprox." },
        { label: "Utilidad neta", value: fmtM(num(m.utilidad_neta)) },
        { label: "Ingresos por empleado", value: ing !== null && emp && emp > 0 ? fmtM(ing / emp) : null },
      ],
    },
    {
      title: "Balance",
      rows: [
        { label: "Efectivo y equivalentes", value: fmtM(cash) },
        { label: "Deuda neta", value: fmtM(v("deuda_neta")), note: "aprox." },
        { label: "Pasivo / Patrimonio", value: act !== null && pat !== null && pat > 0 ? formatPercent((act - pat) / pat, 0) : null },
        { label: "Razón corriente", value: v("liquidez_corriente") === null ? null : formatNumber(v("liquidez_corriente") as number, 2) },
        { label: "Capital de trabajo", value: fmtM(v("capital_trabajo")) },
      ],
    },
    {
      title: "Flujo y ciclo de efectivo",
      rows: [
        { label: "Flujo de caja libre", value: fmtM(v("fcf")), note: "estimado" },
        { label: "Ciclo de efectivo (CCC)", value: v("ccc") === null ? null : `${formatNumber(v("ccc") as number, 0)} días` },
      ],
    },
  ];

  return (
    <aside className="rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-4">
      <h3 className="text-sm font-semibold">Datos clave de {year}</h3>
      <div className="mt-2 divide-y divide-border">
        {sections.map((s) => {
          const rows = s.rows.filter((r) => r.value !== null);
          if (rows.length === 0) return null;
          return (
            <section key={s.title} className="py-2.5 first:pt-1 last:pb-0">
              <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-brand">{s.title}</h4>
              <dl className="mt-1 space-y-1">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <dt className="text-muted">
                      {r.label}
                      {r.note && <span className="ml-1 text-[10px] uppercase text-muted/70">{r.note}</span>}
                    </dt>
                    <dd className="whitespace-nowrap text-right font-semibold tabular-nums">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
