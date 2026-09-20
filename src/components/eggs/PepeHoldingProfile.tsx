import { PEPE_NAME } from "@/lib/eggs";

const CARDS: { label: string; value: string; note: string }[] = [
  { label: "Ingresos 2025", value: "1.000.000.000 de nenúfares", note: "▲ 1.000 % vs 2024" },
  { label: "Activos", value: "Todos los charcos", note: "incluye el pantano completo" },
  { label: "Patrimonio", value: "Un pantano entero", note: "sin hipotecas" },
  { label: "Utilidad neta", value: "Ranas en abundancia", note: "margen neto: sí" },
  { label: "ROE", value: "∞", note: "el denominador se rindió" },
  { label: "Razón corriente", value: "1,0 ranas", note: "por cada rana que debe, tiene una" },
];

const RATIOS: { name: string; value: string; note: string }[] = [
  { name: "ROE (retorno sobre el patrimonio)", value: "∞", note: "infinito, sin ajustar por inflación" },
  { name: "ROA (retorno sobre activos)", value: "100 % de ranas", note: "" },
  { name: "Razón corriente", value: "1,0 ranas", note: "" },
  { name: "Ciclo de conversión de efectivo", value: "−∞ días", note: "cobra antes de vender" },
  { name: "Endeudamiento", value: "0", note: "todo se paga con croacs" },
  { name: "Cobertura de intereses", value: "∞", note: "no tiene intereses, solo nenúfares" },
];

const SCORE: { label: string; puntaje: string }[] = [
  { label: "Liquidez", puntaje: "100" },
  { label: "Endeudamiento", puntaje: "100" },
  { label: "Cobertura de intereses", puntaje: "100" },
  { label: "Rentabilidad", puntaje: "100" },
  { label: "Consistencia de utilidades", puntaje: "100 (todos los años, desde el Pleistoceno)" },
];

// Perfil ficticio que aparece al buscar el nombre exacto de la empresa o al tocar su tarjeta en la cinta.
export default function PepeHoldingProfile() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="rounded-xl border border-brand bg-brand-soft px-4 py-3 text-sm font-medium text-brand" role="note">
        Empresa ficticia. No existe en la base de datos ni en ningún ranking.
      </div>

      <header className="mt-6 flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/egg/pepe-esmoquin.png" alt="" width={96} height={96} className="h-24 w-24 rounded-2xl border border-border object-cover shadow-sm" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{PEPE_NAME}</h1>
          <p className="mt-1 text-sm text-muted">RUC ficticio · Pantano del Guayas</p>
          <p className="mt-1 text-sm text-muted">CIIU RANA.01 · Cría de ranas de esmoquin · Sector: Nenúfares y afines</p>
        </div>
      </header>

      <dl className="mt-6 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
        {[
          ["Tipo de compañía", "Sociedad Anónima de Ranas"],
          ["Tamaño", "Gran nenúfar"],
          ["Empleados", "1 (Pepe)"],
          ["Ranking", "#1 de 1 pantano"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-border py-1.5">
            <dt className="text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{c.label}</div>
            <div className="mt-1 text-xl font-semibold text-brand">{c.value}</div>
            <div className="mt-1 text-xs text-positive">{c.note}</div>
          </div>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Ratios financieros</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {RATIOS.map((r) => (
                <tr key={r.name} className="border-b border-border last:border-b-0">
                  <td className="py-2 pr-3">
                    {r.name}
                    {r.note && <div className="text-xs text-muted">{r.note}</div>}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-brand">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Alertas y crédito</h2>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-5xl font-semibold text-positive">A+++</span>
            <span className="text-sm text-muted">Riesgo: ninguno</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {SCORE.map((s) => (
              <li key={s.label} className="flex justify-between gap-3 border-b border-border py-1 last:border-b-0">
                <span className="text-muted">{s.label}</span>
                <span className="font-medium tabular-nums">{s.puntaje}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">Sin banderas rojas. Solo verdes 🐸</p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-border px-4 py-2 text-sm text-muted opacity-70"
        >
          La rana no emite informes
        </button>
        <span className="text-xs text-muted">Los datos de esta página están escritos a mano y son inventados.</span>
      </div>
    </div>
  );
}
