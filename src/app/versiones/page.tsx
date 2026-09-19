import { CURRENT_VERSION, RELEASES } from "@/lib/versions";

export const metadata = {
  title: "Historial de versiones — Ecuador Financiero",
  description: "Qué cambió en cada versión del sitio.",
};

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat("es-EC", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));

export default function VersionesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Historial de versiones</h1>
      <p className="mt-3 text-muted">
        Versión actual: <strong className="text-foreground">v{CURRENT_VERSION.version}</strong>. Aquí se registra qué
        cambió en cada publicación.
      </p>
      <ol className="mt-8 space-y-6">
        {RELEASES.map((r, i) => (
          <li key={r.version} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                <span style={{ color: "var(--chart-blue)" }}>v{r.version}</span> · {r.title}
                {i === 0 && (
                  <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                    Actual
                  </span>
                )}
              </h2>
              <span className="text-sm text-muted">{fmtDate(r.date)}</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-muted [&_li]:ml-5 [&_li]:list-disc">
              {r.changes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
