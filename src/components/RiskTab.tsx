import type { CreditScore, RiskFlag, Severity } from "@/lib/risk";
import type { RatioDist } from "@/lib/db";
import { formatRatioValue } from "@/lib/format";
import DistributionChart, { type DistItem } from "@/components/DistributionChart";

// Un color por letra: verde (A) → lima (B) → amarillo (C) → naranja (D) → rojo (E).
type Grade = "A" | "B" | "C" | "D" | "E";
const GRADE_STYLE: Record<Grade, { bg: string; fg: string }> = {
  A: { bg: "#1f9d55", fg: "#ffffff" },
  B: { bg: "#84cc16", fg: "#1a2e05" },
  C: { bg: "#facc15", fg: "#3b2f00" },
  D: { bg: "#f97316", fg: "#ffffff" },
  E: { bg: "#dc2626", fg: "#ffffff" },
};
// Tramos del puntaje (0–100), de menor a mayor, con el mismo corte que define el grado.
const BANDS: { grade: Grade; from: number; to: number }[] = [
  { grade: "E", from: 0, to: 35 },
  { grade: "D", from: 35, to: 50 },
  { grade: "C", from: 50, to: 65 },
  { grade: "B", from: 65, to: 80 },
  { grade: "A", from: 80, to: 100 },
];
const gradeOf = (p: number): Grade => (p >= 80 ? "A" : p >= 65 ? "B" : p >= 50 ? "C" : p >= 35 ? "D" : "E");

function ScaleBar({ total }: { total: number }) {
  return (
    <div className="mt-4 w-full">
      <div className="relative">
        <div className="flex h-3 overflow-hidden rounded-full">
          {BANDS.map((b) => (
            <div key={b.grade} style={{ width: `${b.to - b.from}%`, background: GRADE_STYLE[b.grade].bg, opacity: gradeOf(total) === b.grade ? 1 : 0.4 }} />
          ))}
        </div>
        <div
          className="absolute -top-1 h-5 w-0.5 rounded bg-foreground"
          style={{ left: `${Math.min(Math.max(total, 0), 100)}%`, transform: "translateX(-50%)" }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex text-[11px] font-semibold text-muted">
        {BANDS.map((b) => (
          <span key={b.grade} className="text-center" style={{ width: `${b.to - b.from}%` }}>
            {b.grade}
          </span>
        ))}
      </div>
    </div>
  );
}

const SEV: Record<Severity, { label: string; color: string }> = {
  alta: { label: "Alta", color: "var(--negative)" },
  media: { label: "Media", color: "var(--accent)" },
  info: { label: "Informativa", color: "var(--muted)" },
};

const barColor = (p: number) => GRADE_STYLE[gradeOf(p)].bg;

export default function RiskTab({
  score,
  flags,
  year,
  dist,
  groupLabel,
  benchN,
}: {
  score: CreditScore;
  flags: RiskFlag[];
  year: number;
  dist: Record<string, RatioDist>;
  groupLabel: string | null;
  benchN: number;
}) {
  const distItems: DistItem[] = [
    { key: "liquidez_corriente", label: "Liquidez (razón corriente)", dist: dist.liquidez_corriente, fmt: (v) => formatRatioValue("liquidez_corriente", v), dir: "higher" },
    { key: "end_activo", label: "Endeudamiento del activo", dist: dist.end_activo, fmt: (v) => formatRatioValue("end_activo", v, 1), dir: "lower" },
    { key: "cobertura_ebitda", label: "Cobertura de intereses (EBITDA)", dist: dist.cobertura_ebitda, fmt: (v) => formatRatioValue("cobertura_ebitda", v, 1), dir: "higher" },
    { key: "deuda_neta_ebitda", label: "Deuda neta / EBITDA", dist: dist.deuda_neta_ebitda, fmt: (v) => formatRatioValue("deuda_neta_ebitda", v, 1), dir: "lower" },
    { key: "roa", label: "Rentabilidad (ROA)", dist: dist.roa, fmt: (v) => formatRatioValue("roa", v, 1), dir: "higher" },
  ];
  const counts = { alta: 0, media: 0, info: 0 };
  for (const f of flags) counts[f.severity]++;
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold">Capacidad de pago — puntaje de crédito orientativo</h3>
        <p className="mt-1 text-sm text-muted">
          Síntesis de seis indicadores del balance de {year}. Es una referencia para el análisis y no reemplaza una
          calificación crediticia oficial ni el criterio de un analista.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface p-5 text-center">
            {score.grado ? (
              <>
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-4xl font-semibold"
                  style={{ background: GRADE_STYLE[score.grado].bg, color: GRADE_STYLE[score.grado].fg }}
                >
                  {score.grado}
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums" style={{ color: GRADE_STYLE[score.grado].bg }}>
                  {score.total}/100
                </div>
                <div className="text-sm text-muted">{score.etiqueta}</div>
                {score.total !== null && <ScaleBar total={score.total} />}
              </>
            ) : (
              <div className="text-sm text-muted">{score.etiqueta}</div>
            )}
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
            {score.componentes.map((c) => (
              <div key={c.id} title={c.regla}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {c.label} <span className="text-xs font-normal text-muted">({c.peso}%)</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    {c.valor} · {c.puntaje === null ? "sin dato" : `${c.puntaje}/100`}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-border">
                  {c.puntaje !== null && (
                    <div className="h-2 rounded-full" style={{ width: `${Math.max(c.puntaje, 3)}%`, background: barColor(c.puntaje) }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <DistributionChart
            items={distItems}
            groupLabel={groupLabel ?? "misma actividad"}
            n={benchN}
            title="Dónde se ubica en los indicadores del puntaje"
          />
        </div>
        <details className="mt-3 rounded-xl border border-border bg-surface p-3 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-foreground">Cómo se calcula el puntaje</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {score.componentes.map((c) => (
              <li key={c.id}>
                <strong className="text-foreground">
                  {c.label} ({c.peso}%):
                </strong>{" "}
                {c.regla}
              </li>
            ))}
            <li>
              El puntaje total es el promedio ponderado de los componentes con dato (si falta alguno, se reponderan los
              demás). Grados: A ≥ 80, B ≥ 65, C ≥ 50, D ≥ 35, E menor. Las reglas son umbrales generales, no ajustados por
              sector.
            </li>
          </ul>
        </details>
      </section>

      <section>
        <h3 className="text-lg font-semibold">Alertas de control</h3>
        <p className="mt-1 text-sm text-muted">
          Señales que un auditor o analista revisaría con atención. Una alerta no prueba un problema: indica dónde
          conviene mirar y pedir explicaciones.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {(["alta", "media", "info"] as Severity[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: SEV[s].color }} />
              {SEV[s].label}: {counts[s]}
            </span>
          ))}
        </div>
        {flags.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            No se detectaron alertas con las reglas aplicadas para {year}.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {flags.map((f) => (
              <li key={f.id} className="rounded-xl border border-border bg-surface p-3" style={{ borderLeft: `4px solid ${SEV[f.severity].color}` }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{f.titulo}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white"
                    style={{ background: SEV[f.severity].color }}
                  >
                    {SEV[f.severity].label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{f.detalle}</p>
                {f.evidencia && <p className="mt-1 text-xs tabular-nums">{f.evidencia}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="pt-6 text-[10px] leading-snug text-muted opacity-70">
        Esto es informativo: no es un sistema real ni efectivo. No fue hecho por un analista cuantitativo de riesgo llamado Yang que ganó una competencia
        de matemáticas en China.
      </p>
    </div>
  );
}
