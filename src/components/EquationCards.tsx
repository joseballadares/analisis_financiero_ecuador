import { formatMoney, formatPercent } from "@/lib/format";

const tint = (cssVar: string, pct = 14) => `color-mix(in srgb, var(${cssVar}) ${pct}%, var(--surface))`;

function Tile({
  label,
  value,
  chip,
  note,
  color,
  grow,
  strong,
}: {
  label: string;
  value: string;
  chip?: string;
  note?: string;
  color: string;
  grow?: number;
  strong?: boolean;
}) {
  return (
    <div
      className="min-w-0 rounded-xl border p-3"
      style={{
        flex: grow !== undefined ? `${grow} 1 0%` : undefined,
        borderColor: `var(${color})`,
        background: tint(color, strong ? 20 : 12),
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: `var(${color})` }}>
          {label}
        </span>
        {chip && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums" style={{ background: `var(${color})`, color: "var(--surface)" }}>
            {chip}
          </span>
        )}
      </div>
      <div className="mt-1 truncate text-xl font-semibold tabular-nums">{value}</div>
      {note && <div className="mt-0.5 text-[11px] leading-snug text-muted">{note}</div>}
    </div>
  );
}

// Ecuación contable e ingresos → utilidad en cajas proporcionales: el ancho de cada caja es su peso
// dentro del activo (pasivo y patrimonio) o dentro de los ingresos (utilidad neta = margen neto).
export default function EquationCards({
  year,
  activos,
  pasivos,
  patrimonio,
  ingresos,
  utilidad,
}: {
  year: number;
  activos: number | null;
  pasivos: number | null;
  patrimonio: number | null;
  ingresos: number | null;
  utilidad: number | null;
}) {
  const hasBalance = typeof activos === "number" && activos > 0 && typeof patrimonio === "number";
  const pas = hasBalance ? (pasivos ?? activos! - patrimonio!) : null;
  const pasShare = hasBalance && pas !== null ? pas / activos! : null;
  const patShare = hasBalance ? patrimonio! / activos! : null;
  const hasIncome = typeof ingresos === "number" && ingresos > 0 && typeof utilidad === "number";
  const margin = hasIncome ? utilidad! / ingresos! : null;
  const lossOrProfit = margin !== null && margin < 0;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold">Qué tiene y cómo lo financia — {year}</h3>
        {hasBalance && pas !== null && pasShare !== null && patShare !== null ? (
          <div className="mt-3 space-y-2">
            <Tile label="Activo" value={formatMoney(activos)} chip="100%" note="Todo lo que posee la empresa" color="--brand" strong />
            <div className="flex gap-2">
              <Tile
                label="Pasivo"
                value={formatMoney(pas)}
                chip={formatPercent(pasShare, 1)}
                note="Del activo, lo que se financia con deuda"
                color="--negative"
                grow={Math.max(pasShare, 0.28)}
              />
              <Tile
                label="Patrimonio"
                value={formatMoney(patrimonio)}
                chip={formatPercent(patShare, 1)}
                note={patShare < 0 ? "Negativo: las deudas superan a los activos" : "Del activo, lo que aportan los dueños"}
                color={patShare < 0 ? "--negative" : "--accent"}
                grow={Math.max(patShare, 0.28)}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Sin balance disponible para este año.</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold">Cuánto vende y cuánto le queda — {year}</h3>
        {hasIncome && margin !== null ? (
          <div className="mt-3 space-y-2">
            <Tile label="Ingresos" value={formatMoney(ingresos)} chip="100%" note="Ventas y servicios del año" color="--brand" strong />
            <div className="flex gap-2">
              <Tile
                label={lossOrProfit ? "Pérdida neta" : "Utilidad neta"}
                value={formatMoney(utilidad)}
                chip={formatPercent(margin, 1)}
                note={lossOrProfit ? "Margen neto negativo: los gastos superan a los ingresos" : "Margen neto: lo que queda de cada dólar vendido"}
                color={lossOrProfit ? "--negative" : "--positive"}
                grow={Math.max(Math.abs(margin), 0.3)}
              />
              <div
                className="min-w-0 rounded-xl border border-dashed border-border"
                style={{ flex: `${Math.max(1 - Math.max(Math.abs(margin), 0.3), 0.15)} 1 0%` }}
                title="Costos, gastos e impuestos"
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Sin ingresos reportados para este año.</p>
        )}
      </div>
    </div>
  );
}
