import type { RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatRatioValue } from "@/lib/format";
import { CATEGORY_LABELS, CATEGORY_ORDER, FLAG_HELP, FLAG_LABEL, keysByCategory, ratioInfo } from "@/lib/ratioMeta";
import Sparkline from "@/components/Sparkline";
import Semaforo from "@/components/Semaforo";

export default function RatiosTable({
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
  const groups = keysByCategory();
  const current = years[years.length - 1];
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
            <th className="sticky left-0 z-10 min-w-56 bg-surface px-4 py-2.5 text-left">Indicador</th>
            {years.map((y) => (
              <th key={y} className={`px-3 py-2.5 text-right ${y === current ? "text-foreground" : ""}`}>
                {y}
              </th>
            ))}
            <th className="px-3 py-2.5 text-center">Tendencia</th>
            {showBenchmark && <th className="px-3 py-2.5 text-center">Vs pares</th>}
          </tr>
        </thead>
        <tbody>
          {CATEGORY_ORDER.map((cat) => {
            const keys = (groups[cat] ?? []).filter((k) => !only || only.includes(k));
            const visible = keys.filter((k) => {
              const info = ratioInfo(k);
              if (!info) return false;
              const anyValue = years.some((y) => typeof byYear[y]?.values[k] === "number");
              // Los ratios nuevos que dependen de balance NIIF se ocultan si no hay ningún dato.
              return anyValue || !(k in NEW_KEYS);
            });
            if (visible.length === 0) return null;
            return (
              <FragmentRows key={cat} title={CATEGORY_LABELS[cat]} colSpan={years.length + (showBenchmark ? 3 : 2)}>
                {visible.map((k, idx) => {
                  const info = ratioInfo(k)!;
                  const cur = byYear[current];
                  const flag = cur?.flags[k];
                  const series = years.map((y) => {
                    const v = byYear[y]?.values[k];
                    return typeof v === "number" ? v : null;
                  });
                  return (
                    <tr key={k} className={idx % 2 === 0 ? "bg-surface" : "bg-background"} title={info.formula}>
                      <td className={`sticky left-0 z-10 px-4 py-2.5 ${idx % 2 === 0 ? "bg-surface" : "bg-background"}`}>
                        <div className="flex items-center gap-2">
                          <span>{info.nombre}</span>
                          {flag && (
                            <span
                              className="rounded border border-border px-1 text-[10px] uppercase tracking-wide text-muted"
                              title={FLAG_HELP[flag]}
                            >
                              {flag === "aprox_bajo" ? "⚠ " : ""}
                              {FLAG_LABEL[flag]}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted">{info.formula}</div>
                      </td>
                      {years.map((y, i) => (
                        <td
                          key={y}
                          className={`px-3 py-2.5 text-right tabular-nums whitespace-nowrap ${
                            y === current ? "font-semibold" : "text-muted"
                          }`}
                        >
                          {formatRatioValue(k, series[i], 1)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <Sparkline values={series} title={`${info.nombre}: ${years[0]}–${current}`} />
                      </td>
                      {showBenchmark && (
                        <td className="px-3 py-2.5 text-center">
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

const NEW_KEYS: Record<string, true> = {
  margen_ebitda: true,
  roic: true,
  razon_inmediata: true,
  capital_trabajo: true,
  deuda_neta_ebitda: true,
  cobertura_ebitda: true,
  dio: true,
  ccc: true,
  fcf: true,
  fcf_margen: true,
};

function FragmentRows({ title, colSpan, children }: { title: string; colSpan: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="border-y border-border bg-background">
        <td colSpan={colSpan} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {title}
        </td>
      </tr>
      {children}
    </>
  );
}
