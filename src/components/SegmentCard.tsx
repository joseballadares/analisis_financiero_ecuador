import Link from "next/link";
import type { SegmentShare } from "@/lib/queries";
import { formatCompactMoney, formatPercent } from "@/lib/format";

export default function SegmentCard({
  share,
  own,
  ownPrev,
  ruc,
}: {
  share: SegmentShare;
  own: number;
  ownPrev: number | null;
  ruc: string | null;
}) {
  const cur = own / share.total;
  const prev = ownPrev && share.totalPrev > 0 ? ownPrev / share.totalPrev : null;
  const delta = prev !== null ? (cur - prev) * 100 : null;
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold">Participación en su segmento</h3>
      <p className="mt-1 text-xs text-muted">
        Clase de actividad <span className="font-mono">{share.prefix}</span> · {share.empresas.toLocaleString("es-EC")}{" "}
        empresas con ingresos · {formatCompactMoney(share.total)} en total
      </p>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div>
          <div className="text-3xl font-semibold tabular-nums">{formatPercent(cur, cur < 0.1 ? 2 : 1)}</div>
          <div className="text-xs text-muted">de los ingresos de la clase</div>
        </div>
        {delta !== null && (
          <div className={`text-sm tabular-nums ${delta >= 0 ? "text-positive" : "text-negative"}`}>
            {delta >= 0 ? "▲" : "▼"} {new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(Math.abs(delta))} pp vs año anterior
          </div>
        )}
        <div className="text-sm">
          <strong>#{share.rank}</strong> <span className="text-muted">de {share.empresas.toLocaleString("es-EC")}</span>
        </div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-border">
        <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0.5, cur * 100))}%` }} />
      </div>
      <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Empresas líderes de la clase</h4>
      <ol className="mt-2 space-y-1.5 text-sm">
        {share.leaders.map((l, i) => (
          <li key={l.expediente} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">
              <span className="mr-2 text-muted">{i + 1}.</span>
              {l.ruc === ruc ? (
                <strong>{l.nombre}</strong>
              ) : (
                <Link href={`/empresa/${l.ruc}`} className="hover:text-brand">
                  {l.nombre}
                </Link>
              )}
            </span>
            <span className="shrink-0 tabular-nums text-muted">{formatPercent(l.ingresos / share.total, 1)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
