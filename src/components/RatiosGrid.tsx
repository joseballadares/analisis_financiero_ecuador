import ratiosData from "@/data/ratios.json";
import { formatRatioValue } from "@/lib/format";
import { DERIVED_KEYS } from "@/lib/derived";

const DERIVED = new Set<string>(DERIVED_KEYS);

type Indicador = {
  key: string;
  categoria: string;
  nombre: string;
  formula: string;
  descripcion: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  liquidez: "Liquidez",
  solvencia: "Solvencia",
  gestion: "Gestión",
  rentabilidad: "Rentabilidad",
};

export default function RatiosGrid({
  metrics,
  benchmark,
}: {
  metrics: Record<string, number | null>;
  benchmark?: Record<string, number | null> | null;
}) {
  const indicadores = ratiosData.indicadores as Indicador[];
  const byCategory = ratiosData.categorias.map((cat) => ({
    categoria: cat,
    items: indicadores.filter((i) => i.categoria === cat),
  }));

  return (
    <div className="space-y-8">
      {byCategory.map(({ categoria, items }) => (
        <div key={categoria}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {CATEGORY_LABELS[categoria] ?? categoria}
          </h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody>
                {items.map((ind, idx) => {
                  const value = metrics[ind.key];
                  const bench = benchmark ? benchmark[ind.key] : null;
                  if (value === undefined) return null;
                  return (
                    <tr
                      key={ind.key}
                      className={idx % 2 === 0 ? "bg-surface" : "bg-background"}
                      title={ind.formula}
                    >
                      <td className="px-4 py-2.5 text-foreground">
                        {ind.nombre}
                        <span className="ml-2 hidden text-xs text-muted sm:inline">
                          {ind.formula}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatRatioValue(ind.key, value, DERIVED.has(ind.key) ? 1 : 0)}
                      </td>
                      {benchmark && (
                        <td className="px-4 py-2.5 text-right text-muted tabular-nums whitespace-nowrap">
                          sector: {formatRatioValue(ind.key, bench ?? null, DERIVED.has(ind.key) ? 1 : 0)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">
        Rentabilidad (neta y operacional), cobertura de intereses, apalancamiento, endeudamiento
        patrimonial, impacto de gastos y períodos de cobranza y pago se recalculan con las cifras
        exactas de la empresa (utilidad operacional = ingresos - costo de ventas - gastos de
        administración y ventas), porque el archivo de la Superintendencia los trae con errores
        (signo perdido en pérdidas, días inverosímiles, utilidad operacional inconsistente). Un
        guion indica que no es calculable (p. ej. patrimonio negativo). El período medio de pago se
        estima sobre el costo de ventas. El margen bruto, el endeudamiento del activo y la rotación
        de activos también se recalculan exactos (la fuente los trunca a 2 decimales). Los demás
        ratios (liquidez, prueba ácida, otras rotaciones, estructura de pasivos) vienen de la
        Superintendencia, verificados contra los balances, con 2 decimales (truncados).
      </p>
    </div>
  );
}
