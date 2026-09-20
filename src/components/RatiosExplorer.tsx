"use client";

import { useState } from "react";
import type { RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { GROUPS, visibleKeys } from "@/lib/ratioMeta";
import RatiosTable from "@/components/RatiosTable";
import RatiosCards from "@/components/RatiosCards";

// Ratios por año: botones para filtrar por tipo de ratio (rentabilidad, liquidez, operatividad, endeudamiento y retorno
// sobre la inversión) y selector de vista (tabla por años o tarjetas por grupo).
export default function RatiosExplorer({
  years,
  byYear,
  dist,
  only,
  showBenchmark = true,
}: {
  years: number[];
  byYear: Record<number, YearRatios>;
  dist: Record<string, RatioDist>;
  only?: string[];
  showBenchmark?: boolean;
}) {
  const [group, setGroup] = useState("todos");
  const [view, setView] = useState<"table" | "cards">("table");

  const counts = GROUPS.map((g) => ({ g, n: visibleKeys(g, years, byYear, only).length })).filter((x) => x.n > 0);
  const total = counts.reduce((a, x) => a + x.n, 0);
  const active = counts.some((x) => x.g.id === group) ? group : "todos";
  const current = GROUPS.find((g) => g.id === active);

  const groupBtn = (on: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      on ? "border-brand bg-brand text-white" : "border-border text-muted hover:border-brand hover:text-brand"
    }`;
  const viewBtn = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs transition-colors ${on ? "bg-foreground text-background" : "border border-border text-muted hover:border-brand hover:text-brand"}`;

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de ratio">
        <button className={groupBtn(active === "todos")} onClick={() => setGroup("todos")}>
          Todos <span className="opacity-70">({total})</span>
        </button>
        {counts.map(({ g, n }) => (
          <button key={g.id} className={groupBtn(active === g.id)} onClick={() => setGroup(g.id)} title={g.desc}>
            {g.short} <span className="opacity-70">({n})</span>
          </button>
        ))}
      </div>
      {current && <p className="mt-2 text-xs text-muted">{current.desc}</p>}

      <div className="mb-3 mt-4 flex gap-2">
        <button className={viewBtn(view === "table")} onClick={() => setView("table")}>
          Tabla por años
        </button>
        <button className={viewBtn(view === "cards")} onClick={() => setView("cards")}>
          Tarjetas por grupo
        </button>
      </div>

      {view === "table" ? (
        <RatiosTable years={years} byYear={byYear} dist={dist} only={only} showBenchmark={showBenchmark} group={active} />
      ) : (
        <RatiosCards years={years} byYear={byYear} dist={dist} only={only} showBenchmark={showBenchmark} group={active} />
      )}
    </div>
  );
}
