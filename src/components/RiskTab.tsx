import type { CreditScore, RiskFlag, Severity } from "@/lib/risk";

const GRADE_COLOR: Record<string, string> = {
  A: "var(--positive)",
  B: "var(--positive)",
  C: "var(--accent)",
  D: "var(--negative)",
  E: "var(--negative)",
};

const SEV: Record<Severity, { label: string; color: string }> = {
  alta: { label: "Alta", color: "var(--negative)" },
  media: { label: "Media", color: "var(--accent)" },
  info: { label: "Informativa", color: "var(--muted)" },
};

const barColor = (p: number) => (p >= 65 ? "var(--positive)" : p >= 35 ? "var(--accent)" : "var(--negative)");

export default function RiskTab({ score, flags, year }: { score: CreditScore; flags: RiskFlag[]; year: number }) {
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
                  className="flex h-20 w-20 items-center justify-center rounded-full text-4xl font-semibold text-white"
                  style={{ background: GRADE_COLOR[score.grado] }}
                >
                  {score.grado}
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums">{score.total}/100</div>
                <div className="text-sm text-muted">{score.etiqueta}</div>
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
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
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
    </div>
  );
}
