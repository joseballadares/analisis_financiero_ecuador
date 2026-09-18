import Sparkline from "@/components/Sparkline";
import { formatPercent } from "@/lib/format";

type Point = { anio: number; value: number };

const nf = (v: number) => new Intl.NumberFormat("es-EC", { maximumFractionDigits: 0 }).format(v);

export function RankCard({ ranks, universe }: { ranks: Point[]; universe: Record<number, number> }) {
  if (ranks.length < 1) return null;
  const first = ranks[0];
  const last = ranks[ranks.length - 1];
  const topPct = (p: Point) => (universe[p.anio] ? (p.value / universe[p.anio]) * 100 : null);
  const pctFmt = (v: number | null) =>
    v === null ? "—" : `Top ${new Intl.NumberFormat("es-EC", { maximumFractionDigits: v < 0.1 ? 3 : v < 1 ? 2 : 1 }).format(v)}%`;
  const improved = last.value < first.value;
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">Posición en el ranking nacional</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted">{first.anio}</div>
          <div className="text-2xl font-semibold tabular-nums">#{nf(first.value)}</div>
          <div className="text-[11px] text-muted">de {universe[first.anio] ? nf(universe[first.anio]) : "—"}</div>
        </div>
        <div className="flex flex-1 justify-center">
          {/* posición menor = mejor; se invierte el eje para que subir signifique mejorar */}
          <Sparkline values={ranks.map((r) => -r.value)} width={190} height={44} title="Posición en el ranking (sube = mejora)" />
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted">{last.anio}</div>
          <div className="text-2xl font-semibold tabular-nums">#{nf(last.value)}</div>
          <div className="text-[11px] text-muted">de {universe[last.anio] ? nf(universe[last.anio]) : "—"}</div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-muted">
        {pctFmt(topPct(first))} → {pctFmt(topPct(last))}
      </div>
      {ranks.length > 1 && (
        <div className={`mt-2 text-sm font-medium ${improved ? "text-positive" : last.value === first.value ? "text-muted" : "text-negative"}`}>
          {last.value === first.value
            ? "Sin cambio de posición en el período"
            : `${improved ? "Sube" : "Baja"} ${nf(Math.abs(first.value - last.value))} puestos desde ${first.anio}`}
        </div>
      )}
    </div>
  );
}

export function EmployeesCard({ points }: { points: Point[] }) {
  if (points.length < 1) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const peak = points.reduce((a, p) => (p.value > a.value ? p : a), points[0]);
  const low = points.reduce((a, p) => (p.value < a.value ? p : a), points[0]);
  const years = last.anio - first.anio;
  const cagr = years > 0 && first.value > 0 ? Math.pow(last.value / first.value, 1 / years) - 1 : null;
  const label =
    cagr === null ? null : cagr > 0.03 ? "Expansión sostenida" : cagr < -0.03 ? "Contracción de plantilla" : "Plantilla estable";
  const tone = cagr === null ? "text-muted" : cagr > 0.03 ? "text-positive" : cagr < -0.03 ? "text-negative" : "text-muted";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">Empleados reportados</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-muted">{first.anio}</div>
          <div className="text-2xl font-semibold tabular-nums">{nf(first.value)}</div>
        </div>
        <div className="flex flex-1 justify-center">
          <Sparkline values={points.map((p) => p.value)} width={190} height={44} title="Empleados reportados" />
        </div>
        <div className="text-right">
          <div className="text-[11px] text-muted">{last.anio}</div>
          <div className="text-2xl font-semibold tabular-nums">{nf(last.value)}</div>
        </div>
      </div>
      <div className="mt-3 text-center text-xs text-muted">
        Pico {nf(peak.value)} ({peak.anio}) · Mínimo {nf(low.value)} ({low.anio})
      </div>
      {label && cagr !== null && (
        <div className={`mt-2 text-sm font-medium ${tone}`}>
          {label} · CAGR {formatPercent(cagr, 1)}
        </div>
      )}
    </div>
  );
}
