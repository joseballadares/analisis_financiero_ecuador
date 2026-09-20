import type { ReactNode } from "react";

export type Fact = { label: string; value: ReactNode; title?: string; wide?: boolean };

// Ficha compacta de la empresa: datos de identificación en una franja de pocas líneas.
export default function CompanyFicha({ facts }: { facts: Fact[] }) {
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-2.5 rounded-xl border border-border bg-surface px-4 py-3 sm:grid-cols-3 lg:grid-cols-7">
      {facts.map((f) => (
        <div key={f.label} className={f.wide ? "col-span-2 sm:col-span-3 lg:col-span-7" : "min-w-0"}>
          <dt className="text-[10.5px] font-medium uppercase tracking-wider text-muted">{f.label}</dt>
          <dd className={`mt-0.5 text-[13px] leading-snug ${f.wide ? "line-clamp-2" : ""}`} title={f.title}>
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
