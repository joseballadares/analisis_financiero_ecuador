import { formatMoney, formatPercent } from "@/lib/format";

type Tone = "blue" | "gray" | "red";

const TONE: Record<Tone, { bg: string; border: string; text: string }> = {
  blue: {
    bg: "color-mix(in srgb, var(--chart-blue) 12%, var(--surface))",
    border: "var(--chart-blue)",
    text: "var(--chart-blue)",
  },
  gray: {
    bg: "color-mix(in srgb, var(--chart-gray) 14%, var(--surface))",
    border: "var(--chart-gray)",
    text: "var(--chart-gray)",
  },
  red: {
    bg: "color-mix(in srgb, var(--negative) 12%, var(--surface))",
    border: "var(--negative)",
    text: "var(--negative)",
  },
};

export type Amounts = {
  activos: number | null;
  pasivos: number | null;
  patrimonio: number | null;
  ingresos: number | null;
  utilidad: number | null;
};

// Costos y gastos = ingresos - utilidad neta: reúne costo de ventas, gastos, impuestos y participación de
// trabajadores, netos de otros ingresos.
export function costsOf(a: Amounts): number | null {
  return a.ingresos !== null && a.utilidad !== null ? a.ingresos - a.utilidad : null;
}

function Tile({ label, value, chip, note, tone, title }: { label: string; value: string; chip?: string; note?: string; tone: Tone; title?: string }) {
  const t = TONE[tone];
  return (
    <div className="min-w-0 rounded-xl border p-3" style={{ background: t.bg, borderColor: t.border }} title={title}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11.5px] font-semibold uppercase leading-tight tracking-wider" style={{ color: t.text }}>
          {label}
        </span>
        {chip && (
          <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums" style={{ background: t.border, color: "var(--surface)" }}>
            {chip}
          </span>
        )}
      </div>
      <div className="mt-1 break-words text-base font-semibold tabular-nums sm:text-lg">{value}</div>
      {note && <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{note}</div>}
    </div>
  );
}

// Seis tarjetas en fila: ACTIVO, PASIVO, PATRIMONIO, INGRESOS, COSTOS Y GASTOS, UTILIDAD NETA.
export function SixTiles({ a }: { a: Amounts }) {
  const act = a.activos !== null && a.activos > 0 ? a.activos : null;
  const pas = a.pasivos;
  const pat = a.patrimonio;
  const ing = a.ingresos !== null && a.ingresos > 0 ? a.ingresos : null;
  const cost = costsOf(a);
  const margin = ing !== null && a.utilidad !== null ? a.utilidad / ing : null;
  const loss = margin !== null && margin < 0;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Tile label="Activo" value={formatMoney(a.activos)} chip={act ? "100%" : undefined} note="Lo que posee" tone="blue" />
      <Tile
        label="Pasivo"
        value={formatMoney(pas)}
        chip={act && pas !== null ? formatPercent(pas / act, 1) : undefined}
        note="Del activo, financiado con deuda"
        tone="gray"
      />
      <Tile
        label="Patrimonio"
        value={formatMoney(pat)}
        chip={act && pat !== null ? formatPercent(pat / act, 1) : undefined}
        note={pat !== null && pat < 0 ? "Negativo: deudas mayores a activos" : "Del activo, aportado por los dueños"}
        tone={pat !== null && pat < 0 ? "red" : "blue"}
      />
      <Tile label="Ingresos" value={formatMoney(a.ingresos)} chip={ing ? "100%" : undefined} note="Ventas y servicios del año" tone="blue" />
      <Tile
        label="Costos y gastos"
        value={formatMoney(cost)}
        chip={ing && cost !== null ? formatPercent(cost / ing, 1) : undefined}
        note="De los ingresos, lo que se consume"
        tone="gray"
        title="Ingresos menos utilidad neta: incluye costo de ventas, gastos, impuestos y participación de trabajadores, netos de otros ingresos."
      />
      <Tile
        label={loss ? "Pérdida neta" : "Utilidad neta"}
        value={formatMoney(a.utilidad)}
        chip={margin !== null ? formatPercent(margin, 1) : undefined}
        note={loss ? "Margen neto negativo" : "Margen neto: lo que queda de cada dólar"}
        tone={loss ? "red" : "blue"}
      />
    </div>
  );
}

export function RankBanner({ year, rank, universe }: { year: number; rank: number | null; universe: number | null }) {
  if (!rank || !universe) return null;
  const top = (rank / universe) * 100;
  const fmt = new Intl.NumberFormat("es-EC", { maximumFractionDigits: top < 0.1 ? 3 : top < 1 ? 2 : 1 }).format(top);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-sm text-muted">
        Ranking nacional {year} <span className="text-xs">(por ingresos)</span>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold tabular-nums" style={{ color: "var(--chart-blue)" }}>
          #{rank.toLocaleString("es-EC")}
        </span>
        <span className="text-sm text-muted">de {universe.toLocaleString("es-EC")} empresas · Top {fmt}%</span>
      </div>
    </div>
  );
}

type Block = { label: string; value: number | null; share: number | null; tone: Tone; note?: string };

function StackBlock({ b, grow, height }: { b: Block; grow?: number; height?: string }) {
  const t = TONE[b.tone];
  // Bloques pequeños (poco peso): una sola línea con nombre, valor y porcentaje para que nada quede tapado.
  if (grow !== undefined && b.share !== null && Math.abs(b.share) < 0.2) {
    return (
      <div
        className="flex min-h-11 min-w-0 flex-wrap items-center justify-between gap-x-2 rounded-lg border px-3 py-1.5"
        style={{ background: t.bg, borderColor: t.border, flex: `${grow} 1 0%` }}
        title={b.note}
      >
        <span className="text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: t.text }}>
          {b.label}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(b.value)} <span className="text-xs font-normal text-muted">· {formatPercent(b.share, 1)}</span>
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex min-h-14 min-w-0 flex-col justify-center rounded-lg border px-3 py-2"
      style={{ background: t.bg, borderColor: t.border, flex: grow !== undefined ? `${grow} 1 0%` : undefined, height }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: t.text }}>
          {b.label}
        </span>
        {b.share !== null && <span className="text-xs font-semibold tabular-nums">{formatPercent(b.share, 1)}</span>}
      </div>
      <div className="mt-0.5 break-words text-sm font-semibold tabular-nums">{formatMoney(b.value)}</div>
      {b.note && <div className="text-[11.5px] leading-snug text-muted">{b.note}</div>}
    </div>
  );
}

// Dos columnas verticales: la de la izquierda es el total (activo o ingresos); la de la derecha lo divide
// en sus partes (pasivo + patrimonio, o costos y gastos + utilidad). La altura de cada bloque es su peso.
function VerticalStack({ title, left, right, foot }: { title: string; left: Block; right: Block[]; foot?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 flex h-72 gap-3">
        <div className="flex w-1/2 flex-col justify-end">
          <StackBlock b={left} height="100%" />
        </div>
        <div className="flex w-1/2 flex-col gap-1.5">
          {right.map((b) => (
            <StackBlock key={b.label} b={b} grow={Math.max(b.share !== null ? Math.abs(b.share) : 0.2, 0.12)} />
          ))}
        </div>
      </div>
      {foot && <p className="mt-2 text-xs text-muted">{foot}</p>}
    </div>
  );
}

export function VerticalEquations({ year, a }: { year: number; a: Amounts }) {
  const act = a.activos !== null && a.activos > 0 ? a.activos : null;
  const ing = a.ingresos !== null && a.ingresos > 0 ? a.ingresos : null;
  const pat = a.patrimonio;
  const cost = costsOf(a);
  const margin = ing !== null && a.utilidad !== null ? a.utilidad / ing : null;
  const loss = margin !== null && margin < 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {act !== null && a.pasivos !== null && pat !== null ? (
        <VerticalStack
          title={`Qué tiene y cómo lo financia — ${year}`}
          left={{ label: "Activo", value: act, share: 1, tone: "blue", note: "Todo lo que posee la empresa" }}
          right={[
            { label: "Pasivo", value: a.pasivos, share: a.pasivos / act, tone: "gray", note: "Financiado con deuda" },
            ...(pat >= 0
              ? [{ label: "Patrimonio", value: pat, share: pat / act, tone: "blue" as Tone, note: "Aportado por los dueños" }]
              : []),
          ]}
          foot={
            pat < 0
              ? `Patrimonio negativo: ${formatMoney(pat)} (${formatPercent(pat / act, 1)} del activo); las deudas superan a los activos.`
              : "Activo = Pasivo + Patrimonio. La altura de cada bloque es su peso dentro del activo."
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">Sin balance disponible para {year}.</div>
      )}
      {ing !== null && cost !== null && a.utilidad !== null ? (
        <VerticalStack
          title={`Cuánto vende y cuánto le queda — ${year}`}
          left={{ label: "Ingresos", value: ing, share: 1, tone: "blue", note: "Ventas y servicios del año" }}
          right={[
            { label: "Costos y gastos", value: cost, share: cost / ing, tone: "gray", note: "Lo que consume la operación" },
            ...(!loss
              ? [{ label: "Utilidad neta", value: a.utilidad, share: a.utilidad / ing, tone: "blue" as Tone, note: "Margen neto" }]
              : []),
          ]}
          foot={
            loss
              ? `Pérdida neta de ${formatMoney(Math.abs(a.utilidad))} (${formatPercent(margin, 1)} de los ingresos): los costos y gastos superan a los ingresos.`
              : "Ingresos = Costos y gastos + Utilidad neta. La altura de cada bloque es su peso dentro de los ingresos."
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">Sin ingresos reportados para {year}.</div>
      )}
    </div>
  );
}
