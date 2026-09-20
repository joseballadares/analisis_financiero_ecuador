import Link from "next/link";
import type { Signal } from "@/lib/interestingMeta";
import { formatCompactMoney, formatPercent } from "@/lib/format";

type CardCompany = {
  ruc: string;
  nombre: string;
  rank: number;
  ingresos: number;
  margen: number | null;
  roe: number | null;
  signals?: Signal[];
};

export function SignalChip({ s, detail = false, inline = false, tight = false }: { s: Signal; detail?: boolean; inline?: boolean; tight?: boolean }) {
  const down = s.tone === "down";
  // Variante en línea (tablas): la etiqueta y su detalle en la misma línea, con letra más pequeña.
  if (inline) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            down ? "bg-negative/15 text-negative" : "bg-brand-soft text-brand"
          }`}
        >
          <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${down ? "bg-negative" : "bg-brand"}`} />
          {s.label}
        </span>
        <span className="text-[11.5px] leading-snug text-muted">{s.detail}</span>
      </div>
    );
  }
  return (
    <div>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${
          tight ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]"
        } ${
          down ? "bg-negative/15 text-negative" : "bg-brand-soft text-brand"
        }`}
      >
        <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${down ? "bg-negative" : "bg-brand"}`} />
        {s.label}
      </span>
      {detail && <div className={`text-muted ${tight ? "mt-0.5 text-[11.5px] leading-snug" : "mt-1.5 text-xs leading-relaxed"}`}>{s.detail}</div>}
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
        {note && <div className="text-[11px] text-muted/80">{note}</div>}
      </div>
      <div className={`whitespace-nowrap text-base font-semibold tabular-nums ${tone === "pos" ? "text-positive" : tone === "neg" ? "text-negative" : ""}`}>
        {value}
      </div>
    </div>
  );
}

// Tarjeta de una empresa: sector, nombre, la razón por la que destaca y sus indicadores del último año.
export default function FeaturedCard({ c, sector }: { c: CardCompany; sector?: string }) {
  const tone = (v: number | null) => (v === null ? undefined : v >= 0 ? ("pos" as const) : ("neg" as const));
  const down = c.signals?.[0]?.tone === "down";
  return (
    <Link
      href={`/empresa/${c.ruc}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
    >
      <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${down ? "bg-negative" : "bg-brand"}`} />
      {sector && <div className="text-[10.5px] font-semibold uppercase leading-snug tracking-wider text-muted">{sector}</div>}
      <h3 className="mt-2 break-words text-base font-semibold leading-snug group-hover:text-brand">{c.nombre}</h3>
      {c.signals && c.signals.length > 0 && (
        <div className="mt-4 space-y-3">
          {c.signals.slice(0, 2).map((s) => (
            <SignalChip key={s.id} s={s} detail />
          ))}
        </div>
      )}
      <div className="flex-1" />
      <div className="mt-5 divide-y divide-border rounded-xl bg-background/60 px-4 py-3">
        <Metric label="Ingresos" value={formatCompactMoney(c.ingresos)} note={`puesto ${c.rank.toLocaleString("es-EC")}`} />
        <Metric label="Margen neto" value={c.margen === null ? "—" : formatPercent(c.margen, 1)} tone={tone(c.margen)} />
        <Metric label="ROE" value={c.roe === null ? "—" : formatPercent(c.roe, 1)} tone={tone(c.roe)} />
      </div>
    </Link>
  );
}
