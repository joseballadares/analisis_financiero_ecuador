import Link from "next/link";
import type { HomeCompany } from "@/lib/queries";
import { formatCompactMoney, formatPercent } from "@/lib/format";

function Delta({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-muted">{label}</span>
      <span className={`font-medium tabular-nums ${up ? "text-positive" : "text-negative"}`}>
        {up ? "▲" : "▼"} {formatPercent(Math.abs(value), 1)}
      </span>
    </span>
  );
}

function Item({ c }: { c: HomeCompany }) {
  return (
    <Link
      href={`/empresa/${c.ruc}`}
      className="flex shrink-0 items-center gap-3 border-r border-border px-5 py-2 text-xs hover:bg-surface"
    >
      <span className="max-w-[16rem] truncate font-semibold" title={c.nombre}>
        {c.nombre}
      </span>
      <span className="tabular-nums text-muted">{formatCompactMoney(c.ingresos)}</span>
      <Delta label="Margen" value={c.margen} />
      <Delta label="ROE" value={c.roe} />
    </Link>
  );
}

// Cinta de empresas que se desplaza de derecha a izquierda (como los tableros de mercado de valores).
// La lista se duplica para que el desplazamiento sea continuo; se pausa al pasar el cursor.
export default function Ticker({ items, year }: { items: HomeCompany[]; year: number }) {
  if (items.length === 0) return null;
  return (
    <div className="marquee border-y border-border bg-surface/60" aria-label={`Empresas destacadas por ingresos ${year}`}>
      <div className="mx-auto flex max-w-7xl items-stretch">
        <div className="hidden shrink-0 items-center border-r border-border bg-brand-soft px-4 text-[11px] font-semibold uppercase tracking-wider text-brand sm:flex">
          Top 500 · {year}
        </div>
        <div className="marquee-viewport min-w-0 flex-1 overflow-hidden">
          <div className="marquee-track flex w-max">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                {items.map((c) => (
                  <Item key={`${copy}-${c.ruc}`} c={c} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
