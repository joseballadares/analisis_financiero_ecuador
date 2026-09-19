import Link from "next/link";
import type { HomeCompany } from "@/lib/queries";
import { formatCompactMoney, formatPercent } from "@/lib/format";

function Metric({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${tone === "pos" ? "text-positive" : tone === "neg" ? "text-negative" : ""}`}>
        {value}
      </div>
    </div>
  );
}

// Tarjeta de una empresa con sus tres indicadores del último año.
export default function FeaturedCard({ c, sector, year }: { c: HomeCompany; sector?: string; year: number }) {
  const tone = (v: number | null) => (v === null ? undefined : v >= 0 ? ("pos" as const) : ("neg" as const));
  return (
    <Link
      href={`/empresa/${c.ruc}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">#{c.rank}</span>
        {sector && <span className="text-right text-[11px] leading-tight text-muted">{sector}</span>}
      </div>
      <h3 className="mt-3 break-words text-sm font-semibold leading-snug group-hover:text-brand">{c.nombre}</h3>
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Metric label="Ingresos" value={formatCompactMoney(c.ingresos)} />
        <Metric label="Margen neto" value={c.margen === null ? "—" : formatPercent(c.margen, 1)} tone={tone(c.margen)} />
        <Metric label="ROE" value={c.roe === null ? "—" : formatPercent(c.roe, 1)} tone={tone(c.roe)} />
      </div>
    </Link>
  );
}
