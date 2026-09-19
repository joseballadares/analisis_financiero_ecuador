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

export function SignalChip({ s, detail = false }: { s: Signal; detail?: boolean }) {
  const down = s.tone === "down";
  return (
    <div>
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          down ? "bg-negative/15 text-negative" : "bg-brand-soft text-brand"
        }`}
      >
        {s.label}
      </span>
      {detail && <div className="mt-1 text-xs leading-snug text-muted">{s.detail}</div>}
    </div>
  );
}

// Tarjeta de una empresa con sus indicadores del último año y las razones por las que destaca.
export default function FeaturedCard({ c, sector }: { c: CardCompany; sector?: string }) {
  const tone = (v: number | null) => (v === null ? undefined : v >= 0 ? ("pos" as const) : ("neg" as const));
  return (
    <Link
      href={`/empresa/${c.ruc}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-brand"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted">#{c.rank} por ingresos</span>
        {sector && <span className="text-right text-[11px] leading-tight text-muted">{sector}</span>}
      </div>
      <h3 className="mt-3 break-words text-sm font-semibold leading-snug group-hover:text-brand">{c.nombre}</h3>
      {c.signals && c.signals.length > 0 && (
        <div className="mt-3 space-y-2">
          {c.signals.slice(0, 2).map((s) => (
            <SignalChip key={s.id} s={s} detail />
          ))}
        </div>
      )}
      <div className="flex-1" />
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <Metric label="Ingresos" value={formatCompactMoney(c.ingresos)} />
        <Metric label="Margen neto" value={c.margen === null ? "—" : formatPercent(c.margen, 1)} tone={tone(c.margen)} />
        <Metric label="ROE" value={c.roe === null ? "—" : formatPercent(c.roe, 1)} tone={tone(c.roe)} />
      </div>
    </Link>
  );
}
