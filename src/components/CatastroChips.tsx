import Link from "next/link";
import type { Catastro } from "@/lib/catastro";
import { aniosDesde, formatFecha, olderThan } from "@/lib/catastro";
import { titleCase } from "@/lib/format";

const pill = "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground";
const ESTADO_DOT: Record<string, string> = { ACTIVO: "var(--positive)", PASIVO: "var(--muted)", SUSPENDIDO: "var(--negative)" };

// Datos del RUC (catastro público del SRI) al inicio del Resumen. El chip de inicio de actividades es un enlace: lleva a una sorpresa.
export default function CatastroChips({
  c,
  old,
  younger,
}: {
  c: Catastro;
  old: { rank: number } | null;
  younger: number | null; // fracción de empresas activas que son más recientes que esta
}) {
  const anios = c.fecha_inicio ? Math.floor(aniosDesde(c.fecha_inicio)) : null;
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {c.fecha_inicio && (
        <Link
          href={`/empresas-antiguas?ruc=${c.ruc}`}
          className={
            old
              ? "inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand-soft px-3 py-1 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
              : `${pill} transition-colors hover:border-brand hover:text-brand`
          }
        >
          <span className="text-muted">Inicio de actividades</span>
          <span className="font-semibold tabular-nums">{formatFecha(c.fecha_inicio)}</span>
          {anios !== null && <span className="text-muted">· {anios} {anios === 1 ? "año" : "años"}</span>}
          {old && <span>★ Entre las más antiguas del Ecuador (#{old.rank})</span>}
        </Link>
      )}
      {old && younger !== null && (
        <span className={pill}>Más antigua {olderThan(younger)}</span>
      )}
      {c.estado && (
        <span className={pill}>
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: ESTADO_DOT[c.estado] ?? "var(--muted)" }} />
          <span className="text-muted">Estado SRI</span> {titleCase(c.estado)}
        </span>
      )}
      {(c.n_establecimientos ?? 0) > 0 && (
        <span className={pill}>
          <span className="text-muted">Establecimientos</span> {c.n_establecimientos}
          {(c.n_abiertos ?? 0) !== c.n_establecimientos && <span className="text-muted">({c.n_abiertos} abiertos)</span>}
        </span>
      )}
      {c.canton_est && (
        <span className={pill}>
          <span className="text-muted">Matriz</span> {titleCase(c.canton_est)}
          {c.provincia_est && <span className="text-muted">{`, ${titleCase(c.provincia_est)}`}</span>}
        </span>
      )}
      {(c.n_provincias ?? 0) > 1 && <span className={pill}>Presente en {c.n_provincias} provincias</span>}
      {c.obligado === "S" && <span className={pill}>Obligada a llevar contabilidad</span>}
      {c.especial === "S" && <span className={pill}>Contribuyente especial</span>}
      {c.agente_retencion === "S" && <span className={pill}>Agente de retención</span>}
    </div>
  );
}
