import type { RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatRatioValue } from "@/lib/format";
import { FLAG_HELP, FLAG_LABEL, GROUPS, ratioInfo, visibleKeys } from "@/lib/ratioMeta";
import { trendTone } from "@/lib/trend";
import Sparkline from "@/components/Sparkline";
import Semaforo from "@/components/Semaforo";

export default function RatiosTable({
  years,
  byYear,
  dist,
  only,
  showBenchmark = true,
  group = "todos",
}: {
  years: number[];
  byYear: Record<number, YearRatios>;
  dist: Record<string, RatioDist>;
  only?: string[];
  showBenchmark?: boolean;
  group?: string;
}) {
  const current = years[years.length - 1];
  const colSpan = years.length + (showBenchmark ? 3 : 2);
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-10 min-w-44 bg-surface px-3 py-2 text-left">Indicador</th>
            {years.map((y) => (
              <th key={y} className={`px-2 py-2 text-right ${y === current ? "text-foreground" : ""}`}>
                {y}
              </th>
            ))}
            <th className="px-2 py-2 text-center">Tendencia</th>
            {showBenchmark && <th className="px-2 py-2 text-center">Vs pares</th>}
          </tr>
        </thead>
        <tbody>
          {GROUPS.filter((g) => group === "todos" || g.id === group).map((g) => {
            const visible = visibleKeys(g, years, byYear, only);
            if (visible.length === 0) return null;
            return (
              <FragmentRows key={g.id} title={g.label} desc={g.desc} colSpan={colSpan}>
                {visible.map((k, idx) => {
                  const info = ratioInfo(k)!;
                  const flag = byYear[current]?.flags[k];
                  const series = years.map((y) => {
                    const v = byYear[y]?.values[k];
                    return typeof v === "number" ? v : null;
                  });
                  const zebra = idx % 2 === 0 ? "bg-surface" : "bg-background";
                  return (
                    <tr key={k} className={zebra} title={info.formula}>
                      <td className={`sticky left-0 z-10 px-3 py-2 ${zebra}`}>
                        <div className="flex items-center gap-2">
                          <span>{info.nombre}</span>
                          {flag && (
                            <span className="rounded border border-border px-1 text-[11px] uppercase tracking-wide text-muted" title={FLAG_HELP[flag]}>
                              {flag === "aprox_bajo" ? "⚠ " : ""}
                              {FLAG_LABEL[flag]}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] leading-tight text-muted">{info.formula}</div>
                      </td>
                      {years.map((y, i) => (
                        <td
                          key={y}
                          className={`px-2 py-2 text-right tabular-nums whitespace-nowrap ${y === current ? "font-semibold" : "text-muted"}`}
                        >
                          {formatRatioValue(k, series[i], 1)}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center">
                        <Sparkline values={series} width={64} tone={trendTone(series, info.direction)} title={`${info.nombre}: ${years[0]}–${current}`} />
                      </td>
                      {showBenchmark && (
                        <td className="px-2 py-2 text-center">
                          <Semaforo ratioKey={k} dist={dist[k]} dir={info.direction} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </FragmentRows>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRows({ title, desc, colSpan, children }: { title: string; desc: string; colSpan: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-y border-border bg-background">
        <td colSpan={colSpan} className="px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</span>
          <span className="ml-3 text-[11px] normal-case text-muted">{desc}</span>
        </td>
      </tr>
      {children}
    </>
  );
}
