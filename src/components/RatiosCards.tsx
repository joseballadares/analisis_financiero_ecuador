import type { RatioDist } from "@/lib/db";
import type { YearRatios } from "@/lib/star";
import { formatRatioValue } from "@/lib/format";
import { CATEGORY_LABELS, CATEGORY_ORDER, FLAG_HELP, FLAG_LABEL, keysByCategory, ratioInfo } from "@/lib/ratioMeta";
import Sparkline from "@/components/Sparkline";
import Semaforo from "@/components/Semaforo";

const NEW_KEYS = new Set([
  "margen_ebitda",
  "roic",
  "razon_inmediata",
  "capital_trabajo",
  "deuda_neta_ebitda",
  "cobertura_ebitda",
  "dio",
  "ccc",
  "fcf",
  "fcf_margen",
]);

// Vista compacta en 3 columnas: cada ratio en una tarjeta con valor actual, tendencia, semáforo y años previos.
export default function RatiosCards({
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
  const prevYears = years.slice(-4, -1);
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {CATEGORY_ORDER.map((cat) => {
        const keys = (groups[cat] ?? [])
          .filter((k) => !only || only.includes(k))
          .filter((k) => {
            if (!ratioInfo(k)) return false;
            const any = years.some((y) => typeof byYear[y]?.values[k] === "number");
            return any || !NEW_KEYS.has(k);
          });
        if (keys.length === 0) return null;
        return [
          <h4 key={cat + "-h"} className="col-span-full mt-3 text-xs font-semibold uppercase tracking-wide text-muted first:mt-0">
            {CATEGORY_LABELS[cat]}
          </h4>,
          ...keys.map((k) => {
            const info = ratioInfo(k)!;
            const flag = byYear[current]?.flags[k];
            const series = years.map((y) => {
              const v = byYear[y]?.values[k];
              return typeof v === "number" ? v : null;
            });
            const cur = series[series.length - 1];
            return (
              <div key={k} className="rounded-lg border border-border bg-surface px-3 py-2.5" title={info.formula}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[13px] font-medium leading-tight">{info.nombre}</span>
                  {flag && (
                    <span
                      className="shrink-0 rounded border border-border px-1 text-[9px] uppercase tracking-wide text-muted"
                      title={FLAG_HELP[flag]}
                    >
                      {flag === "aprox_bajo" ? "⚠ " : ""}
                      {FLAG_LABEL[flag]}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold tabular-nums leading-none">{formatRatioValue(k, cur, 1)}</span>
                  <Sparkline values={series} width={64} height={22} title={`${info.nombre}: ${years[0]}–${current}`} />
                  {showBenchmark && <Semaforo ratioKey={k} dist={dist[k]} dir={info.direction} width={72} />}
                </div>
                <div className="mt-1.5 truncate text-[11px] leading-snug text-muted" title={info.formula}>
                  {info.formula}
                </div>
                {prevYears.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] tabular-nums text-muted">
                    {prevYears.map((y) => (
                      <span key={y}>
                        {y}: {formatRatioValue(k, typeof byYear[y]?.values[k] === "number" ? (byYear[y].values[k] as number) : null, 1)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          }),
        ];
      })}
    </div>
  );
}
